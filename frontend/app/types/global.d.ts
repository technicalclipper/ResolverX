declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      selectedAddress?: string;
      chainId?: string;
    };
    tronWeb?: {
      defaultAddress: {
        base58: string;
        hex: string;
      };
      contract: () => {
        at: (address: string) => Promise<{
          [key: string]: (...args: any[]) => {
            send: (options: { feeLimit: number; callValue?: number }) => Promise<string>;
            call: () => Promise<any>;
          };
        }>;
      };
      trx: {
        getBalance: (address: string) => Promise<number>;
      };
    };
    tronLink?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}

export {}; 