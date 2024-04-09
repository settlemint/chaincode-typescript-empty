import { instanceToPlain } from 'class-transformer';
import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import stringify from 'json-stringify-deterministic';
import sortKeysRecursive from 'sort-keys-recursive';
import { Asset } from './asset';

@Info({ title: 'AssetTransfer', description: 'Smart contract for trading assets' })
export class AssetTransferContract extends Contract {
  @Transaction()
  public async InitLedger(ctx: Context): Promise<void> {
    const assets: Asset[] = [
      new Asset('asset1', 'blue', 5, 'Tomoko', 300),
      new Asset('asset2', 'red', 5, 'Brad', 400),
      new Asset('asset3', 'green', 10, 'Jin Soo', 500),
      new Asset('asset4', 'yellow', 10, 'Max', 600),
      new Asset('asset5', 'black', 15, 'Adriana', 700),
      new Asset('asset6', 'white', 15, 'Michel', 800),
    ];

    for (const asset of assets) {
      asset.docType = 'asset';
      await ctx.stub.putState(asset.ID, Buffer.from(stringify(sortKeysRecursive(instanceToPlain(asset)))));
      console.info(`Asset ${asset.ID} initialized`);
    }
  }

  // CreateAsset issues a new asset to the world state with given details.
  @Transaction()
  public async CreateAsset(
    ctx: Context,
    id: string,
    color: string,
    size: number,
    owner: string,
    appraisedValue: number
  ): Promise<void> {
    const exists = await this.AssetExists(ctx, id);
    if (exists) {
      throw new Error(`The asset ${id} already exists`);
    }

    const asset = new Asset(id, color, size, owner, appraisedValue);
    asset.docType = 'asset';
    const assetBuffer = Buffer.from(stringify(sortKeysRecursive(instanceToPlain(asset))));

    // Publish event
    ctx.stub.setEvent('CreateAsset', assetBuffer);
    // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
    await ctx.stub.putState(id, assetBuffer);
  }

  // ReadAsset returns the asset stored in the world state with given id.
  @Transaction(false)
  public async ReadAsset(ctx: Context, id: string): Promise<string> {
    const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
    if (!assetJSON || assetJSON.length === 0) {
      throw new Error(`The asset ${id} does not exist`);
    }
    return assetJSON.toString();
  }

  // UpdateAsset updates an existing asset in the world state with provided parameters.
  @Transaction()
  public async UpdateAsset(
    ctx: Context,
    id: string,
    color: string,
    size: number,
    owner: string,
    appraisedValue: number
  ): Promise<void> {
    const exists = await this.AssetExists(ctx, id);
    if (!exists) {
      throw new Error(`The asset ${id} does not exist`);
    }

    // overwriting original asset with new asset
    const updatedAsset = new Asset(id, color, size, owner, appraisedValue);
    updatedAsset.docType = 'asset';

    const assetBuffer = Buffer.from(stringify(sortKeysRecursive(instanceToPlain(updatedAsset))));

    // Publish event
    ctx.stub.setEvent('UpdateAsset', assetBuffer);

    // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
    await ctx.stub.putState(id, assetBuffer);
  }

  // DeleteAsset deletes an given asset from the world state.
  @Transaction()
  public async DeleteAsset(ctx: Context, id: string): Promise<void> {
    const assetString = await this.ReadAsset(ctx, id);

    const assetBuffer = Buffer.from(stringify(sortKeysRecursive(instanceToPlain(assetString))));

    // Publish event
    ctx.stub.setEvent('DeleteAsset', assetBuffer);

    await ctx.stub.deleteState(id);
  }

  // AssetExists returns true when asset with given ID exists in world state.
  @Transaction(false)
  @Returns('boolean')
  public async AssetExists(ctx: Context, id: string): Promise<boolean> {
    const assetJSON = await ctx.stub.getState(id);
    return assetJSON && assetJSON.length > 0;
  }

  // TransferAsset updates the owner field of asset with given id in the world state, and returns the old owner.
  @Transaction()
  public async TransferAsset(ctx: Context, id: string, newOwner: string): Promise<string> {
    const assetString = await this.ReadAsset(ctx, id);
    const asset: Asset = JSON.parse(assetString);
    const oldOwner = asset.Owner;
    asset.Owner = newOwner;

    const assetBuffer = Buffer.from(stringify(sortKeysRecursive(asset)));

    // Publish event
    ctx.stub.setEvent('TransferAsset', assetBuffer);

    // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
    await ctx.stub.putState(id, assetBuffer);
    return oldOwner;
  }

  // GetAllAssets returns all assets found in the world state.
  @Transaction(false)
  @Returns('string')
  public async GetAllAssets(ctx: Context): Promise<string> {
    const allResults = [];
    // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
    const iterator = await ctx.stub.getStateByRange('', '');
    let result = await iterator.next();

    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      allResults.push(record);
      result = await iterator.next();
    }
    return JSON.stringify(allResults);
  }
}
