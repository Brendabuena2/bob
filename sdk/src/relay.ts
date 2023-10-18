//@ts-nocheck
import { Transaction } from "bitcoinjs-lib";
//@ts-nocheck
import { ElectrsClient } from "./electrs";
import { encodeRawInput, encodeRawOutput, encodeRawWitness } from "./utils";

/**
 * Represents information about a Bitcoin transaction.
 */
export interface BitcoinTxInfo {
    /**
     * The transaction version.
     */
    version: string,
    /**
     * The input vector of the transaction, encoded as a hex string.
     */
    inputVector: string,
    /**
     * The output vector of the transaction, encoded as a hex string.
     */
    outputVector: string,
    /**
     * The transaction locktime.
     */
    locktime: string;
    witnessVector?: string,
}

/**
 * Retrieves information about a Bitcoin transaction, such as version, input vector, output vector, and locktime.
 *
 * @param electrsClient - An ElectrsClient instance for interacting with the Electrum server.
 * @param txId - The ID of the Bitcoin transaction.
 * @returns A promise that resolves to a BitcoinTxInfo object.
 * @example
 * ```typescript
 * const BITCOIN_NETWORK = "regtest";
 * const electrsClient = new DefaultElectrsClient(BITCOIN_NETWORK);
 * const txId = "279121610d9575d132c95312c032116d6b8a58a3a31f69adf9736b493de96a16"; //enter the transaction id here
 * const info = await getBitcoinTxInfo(electrsClient, txId);
 * ```
 */
export async function getBitcoinTxInfo(
    electrsClient: ElectrsClient,
    txId: string,
    forWitness?: boolean,
): Promise<BitcoinTxInfo> {
    const txHex = await electrsClient.getTransactionHex(txId);
    const tx = Transaction.fromHex(txHex);

    const versionBuffer = Buffer.allocUnsafe(4);
    versionBuffer.writeInt32LE(tx.version);

    const locktimeBuffer = Buffer.allocUnsafe(4);
    locktimeBuffer.writeInt32LE(tx.locktime);

    return {
        version: versionBuffer.toString("hex"),
        inputVector: encodeRawInput(tx).toString("hex"),
        outputVector: encodeRawOutput(tx).toString("hex"),
        locktime: locktimeBuffer.toString("hex"),
        witnessVector: forWitness ? encodeRawWitness(tx).toString("hex") : undefined,
    }
}

/**
 * Represents a Bitcoin transaction proof, including the merkle proof, transaction index in a block, and Bitcoin headers.
 */
export interface BitcoinTxProof {
    /**
     * The merkle proof for the Bitcoin transaction.
     */
    merkleProof: string;
    /**
     * The index of the transaction in the block.
     */
    txIndexInBlock: number;
    /**
     * Concatenated Bitcoin headers for proof verification.
     */
    bitcoinHeaders: string;
}

/**
 * Retrieves a proof for a Bitcoin transaction, including the merkle proof, transaction index in the block, and Bitcoin headers.
 *
 * @param electrsClient - An ElectrsClient instance for interacting with the Electrum server.
 * @param txId - The ID of the Bitcoin transaction.
 * @param txProofDifficultyFactor - The number of block headers to retrieve for proof verification.
 * @example
 * ```typescript
 * const BITCOIN_NETWORK = "regtest";
 * const electrsClient = new DefaultElectrsClient(BITCOIN_NETWORK);
 * const txId = "279121610d9575d132c95312c032116d6b8a58a3a31f69adf9736b493de96a16";//enter the transaction id here
 * const txProofDifficultyFactor = "1";//enter the difficulty factor
 * const info = await getBitcoinTxProof(electrsClient, txId, txProofDifficultyFactor);
 * ```
 */
export async function getBitcoinTxProof(
    electrsClient: ElectrsClient,
    txId: string,
    txProofDifficultyFactor: number,
): Promise<BitcoinTxProof> {
    const merkleProof = await electrsClient.getMerkleProof(txId);
    const bitcoinHeaders = await getBitcoinHeaders(electrsClient, merkleProof.blockHeight, txProofDifficultyFactor);

    return {
        merkleProof: merkleProof.merkle,
        txIndexInBlock: merkleProof.pos,
        bitcoinHeaders: bitcoinHeaders,
    }
}

export async function getBitcoinHeaders(
    electrsClient: ElectrsClient,
    startHeight: number,
    numBlocks: number,
): Promise<string> {
    const range = (start: number, end: number) => Array.from({ length: end - start }, (_element, index) => index + start);
    const blockHeights = range(startHeight, startHeight + numBlocks);

    const bitcoinHeaders = await Promise.all(blockHeights.map(async height => {
        const hash = await electrsClient.getBlockHash(height);
        return electrsClient.getBlockHeader(hash);
    }));

    return bitcoinHeaders.join('');
}
