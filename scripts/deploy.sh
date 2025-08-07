#!/bin/bash

# Deep360 生产部署脚本
# 使用方法: ./scripts/deploy.sh [environment] [version]

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 配置
ENVIRONMENT=${1:-production}
VERSION=${2:-latest}
PROJECT_NAME="deep360"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"

log_info "开始部署 Deep360 平台"
log_info "环境: $ENVIRONMENT"
log_info "版本: $VERSION"

# 检查必需的工具
check_dependencies() {
    log_info "检查依赖工具..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        log_error "Git 未安装"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 检查环境变量
check_environment() {
    log_info "检查环境变量..."
    
    if [ ! -f ".env.${ENVIRONMENT}" ]; then
        log_error "环境配置文件 .env.${ENVIRONMENT} 不存在"
        exit 1
    fi
    
    # 检查必需的环境变量
    source .env.${ENVIRONMENT}
    
    required_vars=(
        "JWT_SECRET"
        "MONGO_ROOT_USERNAME"
        "MONGO_ROOT_PASSWORD"
        "REDIS_PASSWORD"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "环境变量 $var 未设置"
            exit 1
        fi
    done
    
    log_success "环境变量检查完成"
}

# 备份当前数据
backup_data() {
    log_info "开始数据备份..."
    
    mkdir -p "$BACKUP_DIR"
    
    # 备份 MongoDB
    if docker-compose -f $DOCKER_COMPOSE_FILE ps mongodb | grep -q "Up"; then
        log_info "备份 MongoDB 数据..."
        docker-compose -f $DOCKER_COMPOSE_FILE exec -T mongodb mongodump --out /backup/mongodb
        docker cp "$(docker-compose -f $DOCKER_COMPOSE_FILE ps -q mongodb)":/backup/mongodb "$BACKUP_DIR/"
    fi
    
    # 备份 Redis
    if docker-compose -f $DOCKER_COMPOSE_FILE ps redis | grep -q "Up"; then
        log_info "备份 Redis 数据..."
        docker-compose -f $DOCKER_COMPOSE_FILE exec -T redis redis-cli BGSAVE
        sleep 5  # 等待备份完成
        docker cp "$(docker-compose -f $DOCKER_COMPOSE_FILE ps -q redis)":/data/dump.rdb "$BACKUP_DIR/"
    fi
    
    # 备份应用数据
    if [ -d "./uploads" ]; then
        log_info "备份应用文件..."
        cp -r ./uploads "$BACKUP_DIR/"
    fi
    
    if [ -d "./logs" ]; then
        cp -r ./logs "$BACKUP_DIR/"
    fi
    
    log_success "数据备份完成: $BACKUP_DIR"
}

# 拉取最新代码
update_code() {
    log_info "更新代码..."
    
    # 保存当前分支
    current_branch=$(git branch --show-current)
    
    # 拉取最新代码
    if [ "$VERSION" == "latest" ]; then
        git pull origin main
    else
        git fetch --tags
        git checkout "v$VERSION"
    fi
    
    log_success "代码更新完成"
}

# 构建镜像
build_images() {
    log_info "构建 Docker 镜像..."
    
    # 构建生产镜像
    docker build -f Dockerfile.prod -t "${PROJECT_NAME}:${VERSION}" .
    docker tag "${PROJECT_NAME}:${VERSION}" "${PROJECT_NAME}:latest"
    
    log_success "镜像构建完成"
}

# 运行测试
run_tests() {
    log_info "运行测试..."
    
    # 运行 linting
    npm run lint:check
    
    # 运行安全审计
    npm audit --audit-level moderate
    
    # 运行单元测试
    npm test
    
    log_success "测试通过"
}

# 部署服务
deploy_services() {
    log_info "部署服务..."
    
    # 加载环境变量
    export $(cat .env.${ENVIRONMENT} | xargs)
    
    # 停止旧服务（优雅关闭）
    if docker-compose -f $DOCKER_COMPOSE_FILE ps | grep -q "Up"; then
        log_info "停止现有服务..."
        docker-compose -f $DOCKER_COMPOSE_FILE stop
    fi
    
    # 启动新服务
    log_info "启动新服务..."
    docker-compose -f $DOCKER_COMPOSE_FILE up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    log_success "服务部署完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            log_success "应用健康检查通过"
            break
        fi
        
        log_info "健康检查尝试 $attempt/$max_attempts..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "健康检查失败"
        return 1
    fi
    
    # 检查数据库连接
    if docker-compose -f $DOCKER_COMPOSE_FILE exec -T app node -e "
        const mongoose = require('mongoose');
        mongoose.connect(process.env.MONGODB_URI)
            .then(() => { console.log('DB OK'); process.exit(0); })
            .catch(() => process.exit(1));
    "; then
        log_success "数据库连接正常"
    else
        log_error "数据库连接失败"
        return 1
    fi
    
    # 检查 Redis 连接
    if docker-compose -f $DOCKER_COMPOSE_FILE exec -T redis redis-cli ping | grep -q "PONG"; then
        log_success "Redis 连接正常"
    else
        log_error "Redis 连接失败"
        return 1
    fi
}

# 性能测试
performance_test() {
    log_info "执行性能测试..."
    
    if command -v artillery &> /dev/null; then
        npm run performance:test
        log_success "性能测试完成"
    else
        log_warning "Artillery 未安装，跳过性能测试"
    fi
}

# 清理旧镜像
cleanup() {
    log_info "清理旧镜像..."
    
    # 删除悬空镜像
    docker image prune -f
    
    # 保留最近的 3 个版本，删除其他版本
    docker images "${PROJECT_NAME}" --format "table {{.Tag}}\t{{.ID}}" | \
        tail -n +2 | sort -V | head -n -3 | awk '{print $2}' | \
        xargs -r docker rmi
    
    log_success "清理完成"
}

# 发送通知
send_notification() {
    local status=$1
    local message=$2
    
    # 这里可以集成 Slack、钉钉、企业微信等通知
    log_info "发送部署通知: $message"
    
    # 示例：发送到 Slack
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Deep360 部署通知: $message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
}

# 回滚函数
rollback() {
    log_error "部署失败，开始回滚..."
    
    # 停止当前服务
    docker-compose -f $DOCKER_COMPOSE_FILE down
    
    # 恢复数据
    if [ -d "$BACKUP_DIR" ]; then
        log_info "恢复数据..."
        
        # 恢复 MongoDB
        if [ -d "$BACKUP_DIR/mongodb" ]; then
            docker-compose -f $DOCKER_COMPOSE_FILE up -d mongodb
            sleep 10
            docker cp "$BACKUP_DIR/mongodb" "$(docker-compose -f $DOCKER_COMPOSE_FILE ps -q mongodb)":/backup/
            docker-compose -f $DOCKER_COMPOSE_FILE exec -T mongodb mongorestore /backup/mongodb
        fi
        
        # 恢复 Redis
        if [ -f "$BACKUP_DIR/dump.rdb" ]; then
            docker-compose -f $DOCKER_COMPOSE_FILE up -d redis
            sleep 5
            docker cp "$BACKUP_DIR/dump.rdb" "$(docker-compose -f $DOCKER_COMPOSE_FILE ps -q redis)":/data/
            docker-compose -f $DOCKER_COMPOSE_FILE restart redis
        fi
    fi
    
    log_error "回滚完成"
    send_notification "ERROR" "部署失败，已回滚到之前版本"
    exit 1
}

# 主部署流程
main() {
    # 错误时自动回滚
    trap rollback ERR
    
    log_info "==================== 开始部署 ===================="
    
    # 执行部署步骤
    check_dependencies
    check_environment
    backup_data
    update_code
    build_images
    run_tests
    deploy_services
    
    # 健康检查
    if ! health_check; then
        rollback
    fi
    
    # 性能测试（可选）
    if [ "$RUN_PERFORMANCE_TEST" == "true" ]; then
        performance_test
    fi
    
    # 清理
    cleanup
    
    log_success "==================== 部署完成 ===================="
    
    # 显示部署信息
    echo ""
    log_info "部署信息:"
    log_info "环境: $ENVIRONMENT"
    log_info "版本: $VERSION"
    log_info "备份: $BACKUP_DIR"
    log_info "应用地址: http://localhost:3000"
    log_info "监控地址: http://localhost:3001"
    echo ""
    
    # 发送成功通知
    send_notification "SUCCESS" "部署成功完成 - 版本: $VERSION"
}

# 显示帮助信息
show_help() {
    echo "Deep360 部署脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [environment] [version]"
    echo ""
    echo "参数:"
    echo "  environment  部署环境 (默认: production)"
    echo "  version      部署版本 (默认: latest)"
    echo ""
    echo "示例:"
    echo "  $0                    # 部署到生产环境，最新版本"
    echo "  $0 staging           # 部署到测试环境"
    echo "  $0 production 1.2.0  # 部署指定版本到生产环境"
    echo ""
    echo "环境变量:"
    echo "  RUN_PERFORMANCE_TEST=true  # 运行性能测试"
    echo "  SLACK_WEBHOOK_URL          # Slack 通知 URL"
}

# 命令行参数处理
case "$1" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main
        ;;
esac