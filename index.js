#!/usr/bin/env node

const ethers = require('ethers');
const http = require('http');
require('dotenv').config();

const host = process.env.ETH_RPC_HOST || 'localhost';
const rpc_port=process.env.ETH_RPC_PORT || 8545;
const network = process.env.ETH_NETWORK || 'https://bsc-dataseed1.binance.org:443';
const local_port=process.env.ETH_MONITOR_PORT || 50000;
const max_difference=process.env.MAX_BLOCK_DIFFERENCE || 3;

const provider = new ethers.providers.JsonRpcProvider(network);
const localProvider = new ethers.providers.JsonRpcProvider(`http://${host}:`+rpc_port);

localProvider.connection.timeout = 5000;

const onHealthcheckRequest = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  console.log('>> checking '+host+':'+rpc_port+' ('+network+') ');

  let localBlockNum;
  let networkBlockNum;

  try {
    localBlockNum = await localProvider.getBlockNumber();
    console.log('>> localBlock '+localBlockNum);
    networkBlockNum = await provider.getBlockNumber();
    console.log('>> networkBlock '+networkBlockNum);
  } catch (e) {
    console.error(e);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end();
  }

  let responseStatus = networkBlockNum - localBlockNum > max_difference ? 500 : 200;
  if (localBlockNum > 10000 && networkBlockNum <= 0) {
    responseStatus = 200;
  }
  res.writeHead(responseStatus, { 'Content-Type': 'text/plain' });
  res.end((localBlockNum - networkBlockNum).toString());
};

console.log('Starting eth monitoring service for '+host+':'+rpc_port+' on ' + local_port + '...');
http.createServer(onHealthcheckRequest).listen(local_port);
