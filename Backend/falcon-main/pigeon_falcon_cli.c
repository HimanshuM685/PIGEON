#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "falcon.h"

static void print_usage(void) {
    fprintf(stderr,
        "Usage:\n"
        "  pigeon_falcon_cli keygen [logn]\n"
        "  pigeon_falcon_cli sign <secretKeyHex> <messageHex>\n"
        "  pigeon_falcon_cli verify <publicKeyHex> <messageHex> <signatureHex>\n");
}

static int hex_nibble(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}

static int hex_to_bytes(const char *hex, uint8_t **out, size_t *out_len) {
    size_t len = strlen(hex);
    if ((len & 1u) != 0) {
        return -1;
    }

    size_t blen = len / 2;
    uint8_t *buf = (uint8_t *)malloc(blen == 0 ? 1 : blen);
    if (buf == NULL) {
        return -1;
    }

    for (size_t i = 0; i < blen; i++) {
        int hi = hex_nibble(hex[(i << 1)]);
        int lo = hex_nibble(hex[(i << 1) + 1]);
        if (hi < 0 || lo < 0) {
            free(buf);
            return -1;
        }
        buf[i] = (uint8_t)((hi << 4) | lo);
    }

    *out = buf;
    *out_len = blen;
    return 0;
}

static void bytes_to_hex(const uint8_t *src, size_t src_len, char *dst) {
    static const char *hex = "0123456789abcdef";
    for (size_t i = 0; i < src_len; i++) {
        dst[(i << 1)] = hex[src[i] >> 4];
        dst[(i << 1) + 1] = hex[src[i] & 0x0F];
    }
    dst[src_len << 1] = '\0';
}

static int cmd_keygen(int argc, char **argv) {
    unsigned logn = 9;
    if (argc >= 3) {
        char *end = NULL;
        unsigned parsed = (unsigned)strtoul(argv[2], &end, 10);
        if (end == NULL || *end != '\0' || parsed < 1 || parsed > 10) {
            fprintf(stderr, "Invalid logn. Expected integer 1..10.\n");
            return 1;
        }
        logn = parsed;
    }

    shake256_context rng;
    int err = shake256_init_prng_from_system(&rng);
    if (err != 0) {
        fprintf(stderr, "{\"error\":\"rng_init_failed\",\"code\":%d}\n", err);
        return 1;
    }

    size_t sk_len = FALCON_PRIVKEY_SIZE(logn);
    size_t pk_len = FALCON_PUBKEY_SIZE(logn);
    size_t tmp_len = FALCON_TMPSIZE_KEYGEN(logn);

    uint8_t *sk = (uint8_t *)malloc(sk_len);
    uint8_t *pk = (uint8_t *)malloc(pk_len);
    uint8_t *tmp = (uint8_t *)malloc(tmp_len);
    if (sk == NULL || pk == NULL || tmp == NULL) {
        free(sk);
        free(pk);
        free(tmp);
        fprintf(stderr, "{\"error\":\"alloc_failed\"}\n");
        return 1;
    }

    err = falcon_keygen_make(&rng, logn, sk, sk_len, pk, pk_len, tmp, tmp_len);
    free(tmp);
    if (err != 0) {
        free(sk);
        free(pk);
        fprintf(stderr, "{\"error\":\"keygen_failed\",\"code\":%d}\n", err);
        return 1;
    }

    char *sk_hex = (char *)malloc((sk_len << 1) + 1);
    char *pk_hex = (char *)malloc((pk_len << 1) + 1);
    if (sk_hex == NULL || pk_hex == NULL) {
        free(sk);
        free(pk);
        free(sk_hex);
        free(pk_hex);
        fprintf(stderr, "{\"error\":\"alloc_failed\"}\n");
        return 1;
    }

    bytes_to_hex(sk, sk_len, sk_hex);
    bytes_to_hex(pk, pk_len, pk_hex);

    printf("{\"publicKeyHex\":\"%s\",\"secretKeyHex\":\"%s\"}\n", pk_hex, sk_hex);

    free(sk);
    free(pk);
    free(sk_hex);
    free(pk_hex);
    return 0;
}

static int cmd_sign(int argc, char **argv) {
    if (argc < 4) {
        print_usage();
        return 1;
    }

    uint8_t *sk = NULL;
    size_t sk_len = 0;
    uint8_t *msg = NULL;
    size_t msg_len = 0;

    if (hex_to_bytes(argv[2], &sk, &sk_len) != 0 || hex_to_bytes(argv[3], &msg, &msg_len) != 0) {
        free(sk);
        free(msg);
        fprintf(stderr, "{\"error\":\"invalid_hex_input\"}\n");
        return 1;
    }

    int logn = falcon_get_logn(sk, sk_len);
    if (logn < 1 || logn > 10) {
        free(sk);
        free(msg);
        fprintf(stderr, "{\"error\":\"invalid_secret_key\",\"code\":%d}\n", logn);
        return 1;
    }

    shake256_context rng;
    int err = shake256_init_prng_from_system(&rng);
    if (err != 0) {
        free(sk);
        free(msg);
        fprintf(stderr, "{\"error\":\"rng_init_failed\",\"code\":%d}\n", err);
        return 1;
    }

    size_t sig_len = FALCON_SIG_COMPRESSED_MAXSIZE(logn);
    size_t tmp_len = FALCON_TMPSIZE_SIGNDYN(logn);

    uint8_t *sig = (uint8_t *)malloc(sig_len);
    uint8_t *tmp = (uint8_t *)malloc(tmp_len);
    if (sig == NULL || tmp == NULL) {
        free(sk);
        free(msg);
        free(sig);
        free(tmp);
        fprintf(stderr, "{\"error\":\"alloc_failed\"}\n");
        return 1;
    }

    err = falcon_sign_dyn(
        &rng,
        sig,
        &sig_len,
        FALCON_SIG_COMPRESSED,
        sk,
        sk_len,
        msg,
        msg_len,
        tmp,
        tmp_len
    );

    free(tmp);
    free(sk);
    free(msg);

    if (err != 0) {
        free(sig);
        fprintf(stderr, "{\"error\":\"sign_failed\",\"code\":%d}\n", err);
        return 1;
    }

    char *sig_hex = (char *)malloc((sig_len << 1) + 1);
    if (sig_hex == NULL) {
        free(sig);
        fprintf(stderr, "{\"error\":\"alloc_failed\"}\n");
        return 1;
    }

    bytes_to_hex(sig, sig_len, sig_hex);
    printf("{\"signatureHex\":\"%s\"}\n", sig_hex);

    free(sig);
    free(sig_hex);
    return 0;
}

static int cmd_verify(int argc, char **argv) {
    if (argc < 5) {
        print_usage();
        return 1;
    }

    uint8_t *pk = NULL;
    size_t pk_len = 0;
    uint8_t *msg = NULL;
    size_t msg_len = 0;
    uint8_t *sig = NULL;
    size_t sig_len = 0;

    if (hex_to_bytes(argv[2], &pk, &pk_len) != 0
        || hex_to_bytes(argv[3], &msg, &msg_len) != 0
        || hex_to_bytes(argv[4], &sig, &sig_len) != 0) {
        free(pk);
        free(msg);
        free(sig);
        fprintf(stderr, "{\"error\":\"invalid_hex_input\"}\n");
        return 1;
    }

    int logn = falcon_get_logn(pk, pk_len);
    if (logn < 1 || logn > 10) {
        free(pk);
        free(msg);
        free(sig);
        fprintf(stderr, "{\"error\":\"invalid_public_key\",\"code\":%d}\n", logn);
        return 1;
    }

    size_t tmp_len = FALCON_TMPSIZE_VERIFY(logn);
    uint8_t *tmp = (uint8_t *)malloc(tmp_len);
    if (tmp == NULL) {
        free(pk);
        free(msg);
        free(sig);
        fprintf(stderr, "{\"error\":\"alloc_failed\"}\n");
        return 1;
    }

    int err = falcon_verify(sig, sig_len, 0, pk, pk_len, msg, msg_len, tmp, tmp_len);

    free(tmp);
    free(pk);
    free(msg);
    free(sig);

    if (err == 0) {
        printf("{\"valid\":true}\n");
        return 0;
    }

    if (err == FALCON_ERR_BADSIG || err == FALCON_ERR_FORMAT) {
        printf("{\"valid\":false}\n");
        return 0;
    }

    fprintf(stderr, "{\"error\":\"verify_failed\",\"code\":%d}\n", err);
    return 1;
}

int main(int argc, char **argv) {
    if (argc < 2) {
        print_usage();
        return 1;
    }

    if (strcmp(argv[1], "keygen") == 0) {
        return cmd_keygen(argc, argv);
    }

    if (strcmp(argv[1], "sign") == 0) {
        return cmd_sign(argc, argv);
    }

    if (strcmp(argv[1], "verify") == 0) {
        return cmd_verify(argc, argv);
    }

    print_usage();
    return 1;
}
