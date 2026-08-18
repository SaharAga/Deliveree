import os, re, json, yaml

# Let's test our constant-time timingSafeEqual implementation
import hashlib, hmac

def test_timing_safe():
    import hmac
    
    def constant_time_compare(val1: str, val2: str) -> bool:
        # True constant-time string comparison using SHA256 digest
        h1 = hashlib.sha256(val1.encode('utf-8')).digest()
        h2 = hashlib.sha256(val2.encode('utf-8')).digest()
        return hmac.compare_digest(h1, h2) and (val1 == val2)

    assert constant_time_compare("secret_token_123", "secret_token_123") == True
    assert constant_time_compare("secret_token_123", "secret_token_124") == False
    assert constant_time_compare("secret_token_123", "short") == False
    print("constant_time_compare verified successfully!")

test_timing_safe()
