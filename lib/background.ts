type BackgroundProcessOptions<T = any> = {
  onUpdate: (update: any) => void;
  execute: () => Promise<T>;
};

export function createBackgroundProcess<T>({
  onUpdate,
  execute,
}: BackgroundProcessOptions<T>) {
  let isCancelled = false;

  return {
    start: async () => {
      try {
        return await execute();
      } catch (error) {
        if (!isCancelled) {
          console.error('Background process error:', error);
          onUpdate({ error: error.message });
        }
        return null;
      }
    },

    cancel: () => {
      isCancelled = true;
    },
  };
}
