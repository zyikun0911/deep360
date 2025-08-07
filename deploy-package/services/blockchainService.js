/**
 * 区块链服务 - 去中心化存储和智能合约
 */

const { createModuleLogger } = require('../utils/logger');
const crypto = require('crypto');
const { EventEmitter } = require('events');

class BlockchainService extends EventEmitter {
  constructor() {
    super();
    this.logger = createModuleLogger('Blockchain');
    this.nodes = new Map();
    this.contracts = new Map();
    this.transactions = new Map();
    this.ipfsNodes = new Map();
    this.wallets = new Map();
  }

  async initialize() {
    try {
      this.logger.info('初始化区块链服务...');

      // 连接到多个区块链网络
      await this.connectToNetworks();

      // 初始化IPFS网络
      await this.initializeIPFS();

      // 部署智能合约
      await this.deploySmartContracts();

      // 启动区块链监听器
      await this.startBlockchainListeners();

      this.logger.info('区块链服务初始化完成');
    } catch (error) {
      this.logger.error('区块链服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 连接区块链网络
   */
  async connectToNetworks() {
    // 以太坊主网
    this.nodes.set('ethereum', {
      network: 'ethereum',
      rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID',
      chainId: 1,
      gasPrice: 'auto',
      status: 'connecting'
    });

    // Polygon网络
    this.nodes.set('polygon', {
      network: 'polygon',
      rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      chainId: 137,
      gasPrice: 'auto',
      status: 'connecting'
    });

    // Binance Smart Chain
    this.nodes.set('bsc', {
      network: 'bsc',
      rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org',
      chainId: 56,
      gasPrice: 'auto',
      status: 'connecting'
    });

    // Arbitrum L2
    this.nodes.set('arbitrum', {
      network: 'arbitrum',
      rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      chainId: 42161,
      gasPrice: 'auto',
      status: 'connecting'
    });

    // 私有链（用于内部数据）
    this.nodes.set('private', {
      network: 'private',
      rpcUrl: process.env.PRIVATE_CHAIN_RPC || 'http://localhost:8545',
      chainId: 1337,
      gasPrice: '20000000000', // 20 Gwei
      status: 'connecting'
    });

    // 测试连接
    for (const [name, config] of this.nodes) {
      try {
        await this.testConnection(config);
        config.status = 'connected';
        this.logger.info(`区块链网络连接成功: ${name}`);
      } catch (error) {
        config.status = 'failed';
        this.logger.error(`区块链网络连接失败: ${name}`, error);
      }
    }
  }

  /**
   * 初始化IPFS网络
   */
  async initializeIPFS() {
    // 主IPFS节点
    this.ipfsNodes.set('main', {
      type: 'public',
      gateway: 'https://ipfs.io/ipfs/',
      api: 'https://ipfs.infura.io:5001',
      auth: {
        projectId: process.env.IPFS_PROJECT_ID,
        projectSecret: process.env.IPFS_PROJECT_SECRET
      },
      status: 'connecting'
    });

    // Pinata IPFS服务
    this.ipfsNodes.set('pinata', {
      type: 'service',
      gateway: 'https://gateway.pinata.cloud/ipfs/',
      api: 'https://api.pinata.cloud',
      auth: {
        apiKey: process.env.PINATA_API_KEY,
        secretKey: process.env.PINATA_SECRET_KEY
      },
      status: 'connecting'
    });

    // 私有IPFS集群
    this.ipfsNodes.set('private', {
      type: 'private',
      gateway: 'http://localhost:8080/ipfs/',
      api: 'http://localhost:5001',
      clusterSize: 3,
      status: 'connecting'
    });

    this.logger.info('IPFS网络初始化完成');
  }

  /**
   * 部署智能合约
   */
  async deploySmartContracts() {
    // 账号数据存储合约
    this.contracts.set('account_storage', {
      name: 'AccountDataStorage',
      bytecode: this.getAccountStorageContract(),
      abi: this.getAccountStorageABI(),
      networks: ['polygon', 'bsc'], // 低成本网络
      deployed: new Map(),
      purpose: '存储加密的账号数据'
    });

    // 操作日志合约
    this.contracts.set('operation_log', {
      name: 'OperationLog',
      bytecode: this.getOperationLogContract(),
      abi: this.getOperationLogABI(),
      networks: ['private'], // 私有链，快速便宜
      deployed: new Map(),
      purpose: '记录不可篡改的操作日志'
    });

    // 用户身份验证合约
    this.contracts.set('identity', {
      name: 'IdentityVerification',
      bytecode: this.getIdentityContract(),
      abi: this.getIdentityABI(),
      networks: ['ethereum'], // 主网保证安全
      deployed: new Map(),
      purpose: '去中心化身份验证'
    });

    // 代币奖励合约
    this.contracts.set('rewards', {
      name: 'PlatformRewards',
      bytecode: this.getRewardsContract(),
      abi: this.getRewardsABI(),
      networks: ['polygon'],
      deployed: new Map(),
      purpose: '平台代币奖励系统'
    });

    // 部署合约到指定网络
    for (const [contractName, contract] of this.contracts) {
      for (const network of contract.networks) {
        try {
          const address = await this.deployContract(contract, network);
          contract.deployed.set(network, {
            address,
            deployedAt: new Date(),
            status: 'active'
          });
          this.logger.info(`合约部署成功: ${contractName} on ${network}`, { address });
        } catch (error) {
          this.logger.error(`合约部署失败: ${contractName} on ${network}`, error);
        }
      }
    }
  }

  /**
   * 去中心化数据存储
   */
  async storeDataOnIPFS(data, options = {}) {
    try {
      const {
        encrypt = true,
        pin = true,
        replicas = 3,
        metadata = {}
      } = options;

      let processedData = data;

      // 数据加密
      if (encrypt) {
        const encryptionKey = crypto.randomBytes(32);
        const cipher = crypto.createCipher('aes-256-gcm', encryptionKey);
        processedData = {
          encrypted: cipher.update(JSON.stringify(data), 'utf8', 'hex') + cipher.final('hex'),
          key: encryptionKey.toString('hex'),
          algorithm: 'aes-256-gcm'
        };
      }

      // 上传到IPFS
      const results = [];
      for (const [nodeName, node] of this.ipfsNodes) {
        if (node.status === 'connected') {
          try {
            const hash = await this.uploadToIPFS(node, processedData);
            
            // 固定文件（防止垃圾回收）
            if (pin) {
              await this.pinFile(node, hash);
            }

            results.push({
              node: nodeName,
              hash,
              gateway: `${node.gateway}${hash}`,
              uploadedAt: new Date()
            });

            if (results.length >= replicas) break;
          } catch (error) {
            this.logger.error(`IPFS上传失败: ${nodeName}`, error);
          }
        }
      }

      if (results.length === 0) {
        throw new Error('所有IPFS节点上传失败');
      }

      // 记录到区块链
      const ipfsRecord = {
        contentHash: this.calculateContentHash(data),
        ipfsHashes: results.map(r => r.hash),
        encrypted: encrypt,
        replicas: results.length,
        metadata: {
          ...metadata,
          uploadedAt: new Date(),
          size: JSON.stringify(processedData).length
        }
      };

      await this.recordOnBlockchain('account_storage', 'storeData', ipfsRecord);

      this.logger.info('IPFS存储成功', {
        replicas: results.length,
        primaryHash: results[0].hash
      });

      return {
        success: true,
        primaryHash: results[0].hash,
        replicas: results,
        onChainRecord: ipfsRecord,
        accessUrls: results.map(r => r.gateway)
      };

    } catch (error) {
      this.logger.error('IPFS存储失败:', error);
      throw error;
    }
  }

  /**
   * 从IPFS检索数据
   */
  async retrieveDataFromIPFS(hash, options = {}) {
    try {
      const { decrypt = true, verify = true } = options;

      // 尝试从多个节点获取数据
      let data = null;
      for (const [nodeName, node] of this.ipfsNodes) {
        if (node.status === 'connected') {
          try {
            data = await this.downloadFromIPFS(node, hash);
            if (data) {
              this.logger.debug(`IPFS检索成功: ${nodeName}`);
              break;
            }
          } catch (error) {
            this.logger.warn(`IPFS检索失败: ${nodeName}`, error);
          }
        }
      }

      if (!data) {
        throw new Error('无法从任何IPFS节点检索数据');
      }

      // 验证数据完整性
      if (verify) {
        const isValid = await this.verifyDataIntegrity(hash, data);
        if (!isValid) {
          throw new Error('数据完整性验证失败');
        }
      }

      // 解密数据
      if (decrypt && data.encrypted) {
        try {
          const decipher = crypto.createDecipher(data.algorithm, Buffer.from(data.key, 'hex'));
          const decrypted = decipher.update(data.encrypted, 'hex', 'utf8') + decipher.final('utf8');
          data = JSON.parse(decrypted);
        } catch (error) {
          this.logger.error('数据解密失败:', error);
          throw new Error('数据解密失败');
        }
      }

      return {
        success: true,
        data,
        hash,
        retrievedAt: new Date()
      };

    } catch (error) {
      this.logger.error('IPFS检索失败:', error);
      throw error;
    }
  }

  /**
   * 智能合约交互
   */
  async interactWithContract(contractName, method, params = [], network = 'polygon') {
    try {
      const contract = this.contracts.get(contractName);
      if (!contract) {
        throw new Error(`智能合约不存在: ${contractName}`);
      }

      const deployment = contract.deployed.get(network);
      if (!deployment) {
        throw new Error(`合约未在网络 ${network} 上部署`);
      }

      // 构建交易
      const transaction = {
        to: deployment.address,
        data: this.encodeMethodCall(contract.abi, method, params),
        gasLimit: await this.estimateGas(contract, method, params, network),
        gasPrice: await this.getOptimalGasPrice(network),
        nonce: await this.getNonce(network)
      };

      // 签名并发送交易
      const signedTx = await this.signTransaction(transaction, network);
      const txHash = await this.broadcastTransaction(signedTx, network);

      // 等待确认
      const receipt = await this.waitForConfirmation(txHash, network);

      // 记录交易
      this.transactions.set(txHash, {
        contractName,
        method,
        params,
        network,
        receipt,
        timestamp: new Date()
      });

      this.logger.info(`智能合约调用成功: ${contractName}.${method}`, {
        txHash,
        gasUsed: receipt.gasUsed
      });

      return {
        success: true,
        txHash,
        receipt,
        result: this.parseContractResult(contract.abi, method, receipt)
      };

    } catch (error) {
      this.logger.error(`智能合约调用失败: ${contractName}.${method}`, error);
      throw error;
    }
  }

  /**
   * 不可篡改日志记录
   */
  async logImmutableOperation(operation) {
    try {
      const logEntry = {
        id: crypto.randomUUID(),
        operation: operation.type,
        accountId: operation.accountId,
        userId: operation.userId,
        data: this.hashSensitiveData(operation.data),
        timestamp: new Date().toISOString(),
        blockNumber: null,
        txHash: null
      };

      // 记录到区块链
      const result = await this.interactWithContract(
        'operation_log',
        'recordOperation',
        [
          logEntry.id,
          logEntry.operation,
          logEntry.accountId,
          logEntry.data,
          logEntry.timestamp
        ],
        'private'
      );

      logEntry.blockNumber = result.receipt.blockNumber;
      logEntry.txHash = result.txHash;

      this.logger.info('不可篡改日志记录成功', {
        operationId: logEntry.id,
        txHash: logEntry.txHash
      });

      return {
        success: true,
        logEntry,
        onChainProof: {
          txHash: logEntry.txHash,
          blockNumber: logEntry.blockNumber,
          network: 'private'
        }
      };

    } catch (error) {
      this.logger.error('不可篡改日志记录失败:', error);
      throw error;
    }
  }

  /**
   * 去中心化身份验证
   */
  async verifyIdentity(userId, proof) {
    try {
      // 检查区块链上的身份记录
      const identityRecord = await this.queryContract(
        'identity',
        'getIdentity',
        [userId],
        'ethereum'
      );

      if (!identityRecord) {
        return {
          verified: false,
          reason: '身份记录不存在'
        };
      }

      // 验证身份证明
      const isValid = await this.validateIdentityProof(identityRecord, proof);

      if (isValid) {
        // 更新最后验证时间
        await this.interactWithContract(
          'identity',
          'updateLastVerification',
          [userId, Math.floor(Date.now() / 1000)],
          'ethereum'
        );
      }

      return {
        verified: isValid,
        identity: identityRecord,
        verifiedAt: new Date(),
        onChainRecord: true
      };

    } catch (error) {
      this.logger.error('身份验证失败:', error);
      throw error;
    }
  }

  /**
   * 代币奖励系统
   */
  async distributeRewards(userId, rewardType, amount) {
    try {
      const rewardData = {
        recipient: userId,
        type: rewardType,
        amount: amount.toString(),
        reason: this.getRewardReason(rewardType),
        timestamp: Math.floor(Date.now() / 1000)
      };

      // 发放代币奖励
      const result = await this.interactWithContract(
        'rewards',
        'distributeReward',
        [
          rewardData.recipient,
          rewardData.type,
          rewardData.amount,
          rewardData.reason
        ],
        'polygon'
      );

      this.logger.info('代币奖励发放成功', {
        userId,
        rewardType,
        amount,
        txHash: result.txHash
      });

      return {
        success: true,
        reward: rewardData,
        transaction: result
      };

    } catch (error) {
      this.logger.error('代币奖励发放失败:', error);
      throw error;
    }
  }

  /**
   * 获取区块链统计
   */
  getBlockchainStats() {
    const stats = {
      networks: {
        total: this.nodes.size,
        connected: 0,
        failed: 0
      },
      contracts: {
        total: this.contracts.size,
        deployed: 0
      },
      ipfs: {
        nodes: this.ipfsNodes.size,
        connected: 0
      },
      transactions: {
        total: this.transactions.size,
        successful: 0,
        failed: 0
      }
    };

    // 统计网络状态
    for (const node of this.nodes.values()) {
      if (node.status === 'connected') stats.networks.connected++;
      else if (node.status === 'failed') stats.networks.failed++;
    }

    // 统计合约部署
    for (const contract of this.contracts.values()) {
      stats.contracts.deployed += contract.deployed.size;
    }

    // 统计IPFS节点
    for (const node of this.ipfsNodes.values()) {
      if (node.status === 'connected') stats.ipfs.connected++;
    }

    // 统计交易
    for (const tx of this.transactions.values()) {
      if (tx.receipt.status === 1) stats.transactions.successful++;
      else stats.transactions.failed++;
    }

    return stats;
  }

  /**
   * 工具方法
   */
  calculateContentHash(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  hashSensitiveData(data) {
    // 对敏感数据进行哈希处理，保护隐私
    const sensitiveFields = ['password', 'token', 'key', 'secret'];
    const hashedData = { ...data };
    
    for (const field of sensitiveFields) {
      if (hashedData[field]) {
        hashedData[field] = crypto.createHash('sha256').update(hashedData[field]).digest('hex');
      }
    }
    
    return hashedData;
  }

  getRewardReason(rewardType) {
    const reasons = {
      'registration': '新用户注册奖励',
      'daily_active': '每日活跃奖励',
      'referral': '推荐用户奖励',
      'achievement': '成就解锁奖励',
      'contribution': '平台贡献奖励'
    };
    
    return reasons[rewardType] || '平台奖励';
  }

  /**
   * 智能合约代码 (Solidity)
   */
  getAccountStorageContract() {
    return `
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.0;
    
    contract AccountDataStorage {
        struct DataRecord {
            string contentHash;
            string[] ipfsHashes;
            bool encrypted;
            uint256 timestamp;
            address owner;
        }
        
        mapping(bytes32 => DataRecord) private records;
        mapping(address => bytes32[]) private userRecords;
        
        event DataStored(bytes32 indexed recordId, address indexed owner, string contentHash);
        
        function storeData(
            bytes32 recordId,
            string memory contentHash,
            string[] memory ipfsHashes,
            bool encrypted
        ) public {
            records[recordId] = DataRecord({
                contentHash: contentHash,
                ipfsHashes: ipfsHashes,
                encrypted: encrypted,
                timestamp: block.timestamp,
                owner: msg.sender
            });
            
            userRecords[msg.sender].push(recordId);
            emit DataStored(recordId, msg.sender, contentHash);
        }
        
        function getData(bytes32 recordId) public view returns (DataRecord memory) {
            require(records[recordId].owner == msg.sender, "Access denied");
            return records[recordId];
        }
    }`;
  }
}

module.exports = BlockchainService;