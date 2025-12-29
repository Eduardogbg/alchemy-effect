import { Resource } from "../../resource.ts";

/**
 * Properties for creating a Secrets Store.
 */
export type StoreProps = {
  /**
   * Name of the store.
   * @default Generated from physical name
   */
  name?: string;

  /**
   * Secrets to create in the store.
   * Keys are secret names, values are secret values.
   */
  secrets?: Record<string, string>;

  /**
   * Whether to adopt an existing store with the same name if it exists.
   * If true and a store with the same name exists, it will be adopted
   * rather than creating a new one.
   * @default false
   */
  adopt?: boolean;

  /**
   * Whether to delete the store when the resource is destroyed.
   * If set to false, the store will remain but the resource will be
   * removed from state.
   * @default true
   */
  delete?: boolean;
};

/**
 * Attributes returned after creating a Secrets Store.
 */
export type StoreAttr<Props extends StoreProps> = {
  /**
   * The unique ID of the store (UUID)
   */
  storeId: string;

  /**
   * The name of the store
   */
  storeName: Props["name"] extends string ? Props["name"] : string;

  /**
   * The account ID the store belongs to
   */
  accountId: string;

  /**
   * Time when the store was created
   */
  createdAt: string;

  /**
   * Time when the store was last modified
   */
  modifiedAt: string;
};

export interface Store<
  ID extends string = string,
  Props extends StoreProps = StoreProps,
> extends Resource<
  "Cloudflare.SecretsStore.Store",
  ID,
  Props,
  StoreAttr<Props>,
  Store
> {}

export const Store = Resource<{
  <const ID extends string, const Props extends StoreProps>(
    id: ID,
    props?: Props,
  ): Store<ID, Props>;
}>("Cloudflare.SecretsStore.Store");
