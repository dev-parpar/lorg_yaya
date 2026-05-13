import crypto from "crypto";
import https from "https";
import { logger } from "@/lib/logger";

const CERT_CACHE = new Map<string, { cert: string; fetchedAt: number }>();
const CERT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const TIMESTAMP_TOLERANCE_MS = 150_000; // 150 seconds (Alexa requirement)

/**
 * Validates that the SignatureCertChainUrl header meets Amazon's requirements.
 * URL must:
 *   - Use HTTPS scheme
 *   - Have host s3.amazonaws.com (case-insensitive)
 *   - Have path starting with /echo.api/ (case-sensitive)
 *   - Use port 443 if explicitly specified
 */
function isValidCertUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== "https:") return false;
    if (url.hostname.toLowerCase() !== "s3.amazonaws.com") return false;
    if (!url.pathname.startsWith("/echo.api/")) return false;
    if (url.port && url.port !== "443") return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Downloads a PEM certificate chain from Amazon's S3, with a 1-hour cache.
 */
function fetchCert(certUrl: string): Promise<string> {
  const cached = CERT_CACHE.get(certUrl);
  if (cached && Date.now() - cached.fetchedAt < CERT_CACHE_TTL_MS) {
    return Promise.resolve(cached.cert);
  }

  return new Promise((resolve, reject) => {
    https
      .get(certUrl, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const cert = Buffer.concat(chunks).toString("utf-8");
          CERT_CACHE.set(certUrl, { cert, fetchedAt: Date.now() });
          resolve(cert);
        });
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

/**
 * Verifies an Alexa skill request using Amazon's signature verification algorithm.
 *
 * In development (ALEXA_SKIP_VERIFICATION=true) the check is bypassed so you
 * can test with curl or the Alexa Developer Console simulator.
 *
 * References:
 *   https://developer.amazon.com/en-US/docs/alexa/custom-skills/host-a-custom-skill-as-a-web-service.html#verifying-that-the-request-was-sent-by-alexa
 */
export async function verifyAlexaRequest(
  headers: Headers,
  rawBody: string,
): Promise<boolean> {
  // Allow bypassing in development / simulator testing
  if (process.env.ALEXA_SKIP_VERIFICATION === "true") {
    return true;
  }

  try {
    const certChainUrl = headers.get("SignatureCertChainUrl") ?? headers.get("signaturecertchainurl");
    const signature = headers.get("Signature-256") ?? headers.get("signature-256");

    if (!certChainUrl || !signature) {
      logger.warn("[alexa/verify] Missing signature headers");
      return false;
    }

    // 1. Validate cert URL
    if (!isValidCertUrl(certChainUrl)) {
      logger.warn("[alexa/verify] Invalid SignatureCertChainUrl", { certChainUrl });
      return false;
    }

    // 2. Download and verify the certificate
    const pemChain = await fetchCert(certChainUrl);

    // Extract the leaf cert (first PEM block)
    const certMatch = /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/.exec(pemChain);
    if (!certMatch) {
      logger.warn("[alexa/verify] Could not extract certificate from chain");
      return false;
    }
    const cert = new crypto.X509Certificate(certMatch[0]);

    // Check cert is not expired
    const now = new Date();
    if (now < new Date(cert.validFrom) || now > new Date(cert.validTo)) {
      logger.warn("[alexa/verify] Certificate is expired");
      return false;
    }

    // Check Subject Alternative Name contains echo-api.amazon.com
    const san = cert.subjectAltName ?? "";
    if (!san.includes("echo-api.amazon.com")) {
      logger.warn("[alexa/verify] Certificate SAN does not contain echo-api.amazon.com");
      return false;
    }

    // 3. Verify the body signature using RSA-SHA256
    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(rawBody);
    const signatureBuffer = Buffer.from(signature, "base64");
    const isValid = verify.verify(cert.publicKey, signatureBuffer);

    if (!isValid) {
      logger.warn("[alexa/verify] Signature verification failed");
      return false;
    }

    // 4. Check timestamp is within 150 seconds
    let timestamp: string | undefined;
    try {
      const body = JSON.parse(rawBody) as { request?: { timestamp?: string } };
      timestamp = body.request?.timestamp;
    } catch {
      return false;
    }

    if (!timestamp) {
      logger.warn("[alexa/verify] Missing request timestamp");
      return false;
    }

    const requestTime = new Date(timestamp).getTime();
    if (Math.abs(Date.now() - requestTime) > TIMESTAMP_TOLERANCE_MS) {
      logger.warn("[alexa/verify] Request timestamp too old or in the future", { timestamp });
      return false;
    }

    return true;
  } catch (err) {
    logger.error("[alexa/verify] Unexpected verification error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
