import { Binding } from "../../binding.ts";
import type { Capability } from "../../capability.ts";
import type { To } from "../../policy.ts";
import { Worker } from "../worker/worker.ts";
import type { Container, ContainerProps } from "./container.ts";

export interface Bind<B = Container<unknown>>
  extends Capability<"Cloudflare.Container.Bind", B> {}

export const Bind = Binding<
  <B extends Container<unknown>>(
    container: B,
  ) => Binding<Worker, Bind<To<B>>>
>(Worker, "Cloudflare.Container.Bind");

/**
 * Provider for Container bindings to Workers.
 *
 * Containers are bound to Workers as Durable Object namespaces.
 * The binding is identical to a durable_object_namespace binding
 * since containers are built on top of Durable Objects.
 *
 * Note: The container-specific configuration (image, max_instances)
 * is handled by wrangler during deployment, not at binding time.
 */
export const bindFromWorker = () =>
  Bind.provider.succeed({
    attach: ({ source }) => ({
      bindings: [
        {
          // Containers use durable_object_namespace binding type
          type: "durable_object_namespace",
          name: source.id,
          class_name: source.className,
          script_name: source.scriptName,
          environment: source.environment,
          namespace_id: source.namespaceId,
        },
      ],
    }),
  });
