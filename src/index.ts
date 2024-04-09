import type { Contract } from 'fabric-contract-api';
import { AssetTransferContract } from './assetTransfer';

export { AssetTransferContract } from './assetTransfer';

export const contracts: Array<typeof Contract> = [AssetTransferContract];
