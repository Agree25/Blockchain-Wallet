const EC = require("elliptic").ec;
const ec = new EC("secp256k1");
const uuidV1 = require("uuid");
const SHA256 = require("crypto-js/sha256");

class ChainUtil {
  static genKeyPair() {
    //console.log(ec.genKeyPair());
    return ec.genKeyPair();
  }
  static id() {
    return uuidV1.v1();
  }
  static hash(data) {
    return SHA256(JSON.stringify(data)).toString();
  }

  static verifySignature(publicKey, signature, dataHash) {
    try {
      return ec.keyFromPublic(publicKey, "hex").verify(dataHash, signature);
    } catch {
      return false;
    }
  }

  static isValidPublicKey(publicKey) {
    if (typeof publicKey !== "string" || !/^(?:[a-f0-9]{66}|[a-f0-9]{130})$/i.test(publicKey)) return false;
    try {
      return ec.keyFromPublic(publicKey, "hex").validate().result;
    } catch {
      return false;
    }
  }
}

module.exports = ChainUtil;
