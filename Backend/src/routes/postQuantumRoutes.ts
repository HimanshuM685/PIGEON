import { Router, Request, Response } from "express";
import { PostQuantumWallet } from "../crypto/postQuantumWallet";
import { onboardUser } from "../onboard";
import { hexToBytes } from "../crypto/walletSecret";

const router = Router();

interface GenerateWalletRequest {
  strength?: 128 | 256;
}

interface SignMessageRequest {
  message: string;
  secretKey: string; // hex string
}

interface VerifySignatureRequest {
  signature: string; // hex string
  message: string;
  publicKey: string; // hex string
}

interface RecoverWalletRequest {
  mnemonic: string;
}

interface OnboardWithMnemonicRequest {
  phone: string;
  password: string;
  mnemonic?: string;
}

/**
 * POST /api/pq-wallet/generate
 * Generate a new post-quantum wallet with BIP39 mnemonic
 */
router.post(
  "/generate",
  async (req: Request<{}, {}, GenerateWalletRequest>, res: Response) => {
    try {
      const strength = (req.body.strength || 256) as 128 | 256;

      const wallet = await PostQuantumWallet.generateWallet(strength);

      res.json({
        success: true,
        data: {
          mnemonic: wallet.mnemonic,
          publicKey: PostQuantumWallet.publicKeyToHex(
            wallet.falconKeypair.publicKey
          ),
          createdAt: wallet.createdAt,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate wallet",
      });
    }
  }
);

/**
 * POST /api/pq-wallet/recover
 * Recover wallet from BIP39 mnemonic
 */
router.post(
  "/recover",
  async (req: Request<{}, {}, RecoverWalletRequest>, res: Response) => {
    try {
      const { mnemonic } = req.body;

      if (!mnemonic) {
        return res.status(400).json({
          success: false,
          error: "Mnemonic is required",
        });
      }

      const wallet = await PostQuantumWallet.recoverWallet(mnemonic);

      res.json({
        success: true,
        data: {
          mnemonic: wallet.mnemonic,
          publicKey: PostQuantumWallet.publicKeyToHex(
            wallet.falconKeypair.publicKey
          ),
          createdAt: wallet.createdAt,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to recover wallet",
      });
    }
  }
);

/**
 * POST /api/pq-wallet/sign
 * Sign a message with FALCON post-quantum signature
 */
router.post(
  "/sign",
  async (req: Request<{}, {}, SignMessageRequest>, res: Response) => {
    try {
      const { message, secretKey } = req.body;

      if (!message || !secretKey) {
        return res.status(400).json({
          success: false,
          error: "Message and secretKey are required",
        });
      }

      const secretKeyBytes = hexToBytes(secretKey);
      const signature = await PostQuantumWallet.signMessage(
        message,
        secretKeyBytes
      );

      res.json({
        success: true,
        data: {
          signature: Buffer.from(signature).toString("hex"),
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to sign message",
      });
    }
  }
);

/**
 * POST /api/pq-wallet/verify
 * Verify a FALCON signature
 */
router.post(
  "/verify",
  async (req: Request<{}, {}, VerifySignatureRequest>, res: Response) => {
    try {
      const { signature, message, publicKey } = req.body;

      if (!signature || !message || !publicKey) {
        return res.status(400).json({
          success: false,
          error: "Signature, message, and publicKey are required",
        });
      }

      const signatureBytes = hexToBytes(signature);
      const publicKeyBytes = PostQuantumWallet.hexToPublicKey(publicKey);

      const isValid = await PostQuantumWallet.verifySignature(
        signatureBytes,
        message,
        publicKeyBytes
      );

      res.json({
        success: true,
        data: {
          valid: isValid,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to verify signature",
      });
    }
  }
);

/**
 * POST /api/pq-wallet/onboard
 * Create wallet by default (Falcon + mnemonic), or import from provided mnemonic.
 */
router.post(
  "/onboard",
  async (req: Request<{}, {}, OnboardWithMnemonicRequest>, res: Response) => {
    try {
      const { phone, password, mnemonic } = req.body;
      if (!phone || !password) {
        res.status(400).json({
          success: false,
          error: "phone and password are required",
        });
        return;
      }

      const result = await onboardUser(phone, password, mnemonic);
      if (result.error && !result.alreadyOnboarded) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to onboard wallet",
      });
    }
  }
);

export default router;
