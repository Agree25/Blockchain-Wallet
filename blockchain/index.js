
const Block= require('./block.js');

class Blockchain{
    constructor(){
        this.chain=[Block.genesis()];

    }
    addBlock(data){
        const block=Block.mineBlock(this.chain[this.chain.length-1],data);
        this.chain.push(block);
        return block;
    }
    isValidChain(chain){
        if (!Array.isArray(chain) || chain.length === 0) return false;
        if(JSON.stringify(chain[0])!== JSON.stringify(Block.genesis()))return false;

        for(let i=1;i<chain.length;i++){
            const block=chain[i];
            const lastBlock=chain[i-1];

            if (!block || !Number.isSafeInteger(block.timestamp) ||
                block.timestamp <= lastBlock.timestamp || !Array.isArray(block.data) ||
                !Number.isSafeInteger(block.nonce) || block.nonce < 0 ||
                !Number.isInteger(block.difficulty) || block.difficulty < 1 || block.difficulty > 64 ||
                typeof block.hash !== 'string' || !/^[a-f0-9]{64}$/.test(block.hash)) return false;
            if (block.difficulty !== Block.adjustDifficulty(lastBlock, block.timestamp) ||
                !block.hash.startsWith('0'.repeat(block.difficulty))) return false;
            if(block.lastHash !== lastBlock.hash || block.hash !== Block.blockHash(block))return false;
        }

        return true;
    }
    replaceChain(newChain){
         if(!Array.isArray(newChain) || newChain.length<=this.chain.length){
             console.log("Received chain is not longer than the current chain.");
             return false;
         }
         else if(this.isValidChain(newChain)===false){
             console.log("The received chain is not valid.");
             return false;
         }
         else{
             console.log("Replacing blockchain with the new chain.");
             this.chain = newChain;
             return true;
         }
     }
}

module.exports=Blockchain;
