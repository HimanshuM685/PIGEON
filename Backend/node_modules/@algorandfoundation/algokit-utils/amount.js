'use strict';

var types_amount = require('./types/amount.js');

Number.prototype.microAlgos = function () {
    return types_amount.AlgoAmount.MicroAlgo(this);
};
Number.prototype.algos = function () {
    return types_amount.AlgoAmount.Algo(this);
};
Number.prototype.microAlgo = function () {
    return types_amount.AlgoAmount.MicroAlgo(this);
};
Number.prototype.algo = function () {
    return types_amount.AlgoAmount.Algo(this);
};
BigInt.prototype.microAlgo = function () {
    return types_amount.AlgoAmount.MicroAlgo(this);
};
BigInt.prototype.algo = function () {
    return types_amount.AlgoAmount.Algo(this);
};
/** Returns an amount of Algo using AlgoAmount
 * @param algos The amount of Algo
 */
const algos = (algos) => {
    return types_amount.AlgoAmount.Algo(algos);
};
/** Returns an amount of Algo using AlgoAmount
 * @param algos The amount of Algo
 */
const algo = (algos) => {
    return types_amount.AlgoAmount.Algo(algos);
};
/** Returns an amount of µAlgo using AlgoAmount
 * @param microAlgos The amount of µAlgo
 */
const microAlgos = (microAlgos) => {
    return types_amount.AlgoAmount.MicroAlgo(microAlgos);
};
/** Returns an amount of µAlgo using AlgoAmount
 * @param microAlgos The amount of µAlgo
 */
const microAlgo = (microAlgos) => {
    return types_amount.AlgoAmount.MicroAlgo(microAlgos);
};
/** Returns an amount of µAlgo to cover standard fees for the given number of transactions using AlgoAmount
 * @param numberOfTransactions The of standard transaction fees to return the amount of Algo
 */
const transactionFees = (numberOfTransactions) => {
    return types_amount.AlgoAmount.MicroAlgo(BigInt(numberOfTransactions) * ALGORAND_MIN_TX_FEE.microAlgo);
};
const ALGORAND_MIN_TX_FEE = types_amount.AlgoAmount.MicroAlgo(1000);

exports.ALGORAND_MIN_TX_FEE = ALGORAND_MIN_TX_FEE;
exports.algo = algo;
exports.algos = algos;
exports.microAlgo = microAlgo;
exports.microAlgos = microAlgos;
exports.transactionFees = transactionFees;
//# sourceMappingURL=amount.js.map
