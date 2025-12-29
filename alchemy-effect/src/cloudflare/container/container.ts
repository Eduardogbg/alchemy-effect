/**
 * Cloudflare Container namespace definition.
 *
 * Containers are Durable Object-based compute that run Docker containers.
 * They are configured via wrangler.toml/wrangler.jsonc and deployed with Workers.
 *
 * This is a binding-only resource (no API CRUD operations).
 * Container lifecycle is managed via Worker deployment.
 *
 * @see https://developers.cloudflare.com/containers/
 */
export type ContainerProps = {
  /**
   * The Durable Object class name that extends Container.
   * This must match a class exported from your Worker that extends
   * the Container class from @cloudflare/containers.
   */
  className: string;

  /**
   * Optional script name if the container is defined in a different Worker.
   */
  scriptName?: string;

  /**
   * Optional environment for the Durable Object.
   */
  environment?: string;

  /**
   * Optional namespace ID if adopting an existing Durable Object namespace.
   */
  namespaceId?: string;
};

/**
 * A Container namespace binding.
 *
 * This is a "virtual resource" - it doesn't have API CRUD operations.
 * Containers are Durable Object-based compute that run Docker containers.
 * Container lifecycle is managed via Worker deployment.
 * The `props` property contains the configuration for binding resolution.
 */
export type Container<T = unknown> = {
  type: "container";
  id: string;
  /**
   * The props are exposed for the binding system.
   * At runtime, `source.props` will contain these values.
   */
  props: ContainerProps;
  __service__: T;
};

/**
 * Creates a Container namespace binding.
 *
 * Containers in Cloudflare are Durable Objects that run Docker containers.
 * The Container function creates a binding definition that can be attached
 * to a Worker.
 *
 * @example
 * ```ts
 * import { Container } from "alchemy-effect/cloudflare";
 *
 * const MyContainer = Container<MyContainerService>("my-container", {
 *   className: "MyContainer",
 * });
 * ```
 */
export function Container<T = unknown>(
  id: string,
  props: ContainerProps,
): Container<T> {
  return {
    type: "container",
    id,
    props,
    __service__: undefined!,
  };
}

/**
 * Type guard to check if a binding is a Container.
 */
export function isContainer(binding: unknown): binding is Container {
  return (
    typeof binding === "object" &&
    binding !== null &&
    "type" in binding &&
    binding.type === "container"
  );
}
