const {DIFFICULTY,MINE_RATE}=require("../config");
const ChainUtil = require("../chain-util");

class Block {
    constructor(timestamp, lastHash, hash, data,nonce,difficulty) {
        this.timestamp = timestamp;
        this.lastHash = lastHash;
        this.hash = hash;
        this.data = data;
        this.nonce=nonce;
        this.difficulty=difficulty || DIFFICULTY;
    }
    tostring() {
        return `Block =>
        Timestamp: ${this.timestamp},
        LastHash: ${this.lastHash.substring(0, 10)},
        Hash: ${this.hash.substring(0, 10)},
        Nonce:${this.nonce},
        Difficulty:${this.difficulty},
        Data: ${this.data}
        `;
    }
    
    static genesis(){
        return new this("genesis timestamp","0","fhufhwfeninf",[],0);
    }
    static mineBlock(lastBlock,data){
        let timestamp;
        const lastHash=lastBlock.hash;
        let nonce=0;
        let hash;
        let {difficulty}=lastBlock;
        do{
            nonce++;
            timestamp=Date.now();
            difficulty=this.adjustDifficulty(lastBlock,timestamp);
            hash=Block.hash(timestamp,lastHash,data,nonce,difficulty);
        }while(hash.substring(0,difficulty)!='0'.repeat(difficulty));
        

        return new this(timestamp,lastHash,hash,data,nonce,difficulty);
    }
    static hash(timestamp,lastHash,data,nonce,difficulty){
        return ChainUtil.hash(`${timestamp}${lastHash}${data}${nonce}${difficulty}`);
    }
    static blockHash(block){
        const {timestamp,lastHash,data,nonce,difficulty}=block;

        return this.hash(timestamp,lastHash,data,nonce,difficulty);
    }
    static adjustDifficulty(lastBlock,currentTime){
        let {difficulty}=lastBlock;
        difficulty=lastBlock.timestamp+MINE_RATE>currentTime? difficulty+1: difficulty-1;
        return difficulty;
    }
}

module.exports=Block