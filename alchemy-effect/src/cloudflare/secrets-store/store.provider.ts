import type { SecretsStore } from "cloudflare/resources";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { createPhysicalName } from "../../physical-name.ts";
import { Account } from "../account.ts";
import { CloudflareApi, CLOUDFLARE_API_TOKEN } from "../api.ts";
import { Store, type StoreAttr, type StoreProps } from "./store.ts";

// Type for SDK response objects
type StoreResponseObject = SecretsStore.Stores.StoreListResponse;

export const storeProvider = () =>
  Store.provider.effect(
    Effect.gen(function* () {
      const api = yield* CloudflareApi;
      const accountId = yield* Account;

      const createStoreName = (id: string, name: string | undefined) =>
        Effect.gen(function* () {
          return name ?? (yield* createPhysicalName({ id }));
        });

      const mapResult = <Props extends StoreProps>(
        result: StoreResponseObject,
      ): StoreAttr<Props> =>
        ({
          storeId: result.id,
          storeName: result.name,
          accountId,
          createdAt: result.created,
          modifiedAt: result.modified,
        }) as StoreAttr<Props>;

      // WORKAROUND: Cloudflare SDK expects array body for store creation,
      // but the API rejects arrays and only accepts a single object.
      // The SDK types show: body: Array<{name: string}>
      // But the API actually requires: {name: string}
      // See: https://developers.cloudflare.com/api/resources/secrets_store/subresources/stores/methods/create/
      // TODO: Remove this workaround when Cloudflare fixes SDK/API mismatch
      const createStore = Effect.fn(function* (storeName: string) {
        const apiToken = yield* Effect.map(CLOUDFLARE_API_TOKEN, Option.getOrThrow);

        const response = yield* Effect.tryPromise({
          try: async () => {
            const res = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${accountId}/secrets_store/stores`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ name: storeName }),
              },
            );

            if (!res.ok) {
              const error = await res.text();
              throw new Error(`Failed to create store: ${error}`);
            }

            const data = (await res.json()) as {
              success: boolean;
              result: StoreResponseObject;
              errors: Array<{ code: number; message: string }>;
            };

            if (!data.success) {
              throw new Error(
                `Store creation failed: ${data.errors.map((e) => e.message).join(", ")}`,
              );
            }

            return data.result;
          },
          catch: (error) => new Error(String(error)),
        });

        return response;
      });

      const listStores = Effect.fn(function* (name?: string) {
        const stores: StoreResponseObject[] = [];
        for await (const store of api.secretsStore.stores.list({
          account_id: accountId,
        })) {
          stores.push(store);
        }
        return name ? stores.filter((s) => s.name === name) : stores;
      });

      const deleteStore = Effect.fn(function* (storeId: string) {
        yield* api.secretsStore.stores
          .delete(storeId, { account_id: accountId })
          .pipe(Effect.catchTag("NotFound", () => Effect.void));
      });

      const listSecrets = Effect.fn(function* (storeId: string) {
        const secrets: SecretsStore.Stores.SecretListResponse[] = [];
        for await (const secret of api.secretsStore.stores.secrets.list(storeId, {
          account_id: accountId,
        })) {
          secrets.push(secret);
        }
        return secrets;
      });

      const createSecrets = Effect.fn(function* (
        storeId: string,
        secrets: Record<string, string>,
      ) {
        const secretEntries = Object.entries(secrets);
        if (secretEntries.length === 0) return;

        const body = secretEntries.map(([name, value]) => ({
          name,
          value,
          scopes: ["workers"] as const,
        }));

        yield* api.secretsStore.stores.secrets.create(storeId, {
          account_id: accountId,
          body,
        });
      });

      const deleteSecrets = Effect.fn(function* (
        storeId: string,
        secretIds: Array<string>,
      ) {
        for (const secretId of secretIds) {
          yield* api.secretsStore.stores.secrets
            .delete(storeId, secretId, { account_id: accountId })
            .pipe(Effect.catchTag("NotFound", () => Effect.void));
        }
      });

      return {
        stables: ["storeId", "accountId"],

        diff: Effect.fn(function* ({ id, news, output }) {
          if (output.accountId !== accountId) {
            return { action: "replace" } as const;
          }

          const storeName = yield* createStoreName(id, news.name);
          if (storeName !== output.storeName) {
            return { action: "replace" } as const;
          }
        }),

        create: Effect.fn(function* ({ id, news, session }) {
          const storeName = yield* createStoreName(id, news.name);

          const existingStores = yield* listStores(storeName);
          const existing = existingStores.find((s) => s.name === storeName);

          if (existing) {
            if (news.adopt) {
              yield* session.note(`Adopting existing store: ${storeName}`);

              if (news.secrets) {
                yield* createSecrets(existing.id, news.secrets);
              }

              return mapResult<StoreProps>(existing);
            }
            return yield* Effect.fail(
              new Error(`Store "${storeName}" already exists`),
            );
          }

          yield* session.note(`Creating store: ${storeName}`);
          const store = yield* createStore(storeName);
          yield* session.note(store.id);

          if (news.secrets) {
            yield* createSecrets(store.id, news.secrets);
          }

          return mapResult<StoreProps>(store);
        }),

        update: Effect.fn(function* ({ news, olds, output, session }) {
          const newSecrets = news.secrets ?? {};
          const oldSecrets = olds?.secrets ?? {};

          const existingSecrets = yield* listSecrets(output.storeId);
          const existingSecretMap = new Map(
            existingSecrets.map((s) => [s.name, s]),
          );

          // Find secrets to delete (exist but not in new config)
          const secretsToDelete: string[] = [];
          for (const secret of existingSecrets) {
            if (!(secret.name in newSecrets)) {
              secretsToDelete.push(secret.id);
            }
          }

          if (secretsToDelete.length > 0) {
            yield* session.note(
              `Deleting ${secretsToDelete.length} secret(s)`,
            );
            yield* deleteSecrets(output.storeId, secretsToDelete);
          }

          // Find secrets to create/update
          const secretsToCreate: Record<string, string> = {};
          for (const [name, value] of Object.entries(newSecrets)) {
            if (!existingSecretMap.has(name) || oldSecrets[name] !== value) {
              secretsToCreate[name] = value;
            }
          }

          if (Object.keys(secretsToCreate).length > 0) {
            yield* session.note(
              `Creating/updating ${Object.keys(secretsToCreate).length} secret(s)`,
            );
            yield* createSecrets(output.storeId, secretsToCreate);
          }

          return output;
        }),

        delete: Effect.fn(function* ({ output, olds }) {
          if (olds.delete !== false) {
            yield* deleteStore(output.storeId);
          }
        }),

        read: Effect.fn(function* ({ id, olds, output }) {
          if (output?.storeId) {
            const stores = yield* listStores();
            const match = stores.find((s) => s.id === output.storeId);
            if (match) {
              return mapResult<StoreProps>(match);
            }
            return undefined;
          }

          const storeName = yield* createStoreName(id, olds?.name);
          const stores = yield* listStores(storeName);
          const match = stores.find((s) => s.name === storeName);

          if (match) {
            return mapResult<StoreProps>(match);
          }

          return undefined;
        }),
      };
    }),
  );
