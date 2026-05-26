import time
import sys
import os
from check_db import check_db

# Suppress stdout to just measure execution time without print overhead
old_stdout = sys.stdout
sys.stdout = open(os.devnull, 'w')

try:
    start = time.time()
    for _ in range(10): # Run multiple times to get a better average
        check_db()
    end = time.time()
finally:
    sys.stdout.close()
    sys.stdout = old_stdout

print(f"Time taken (10 iterations, no printing): {end - start:.4f} seconds")
print(f"Average time per run: {(end - start) / 10:.4f} seconds")
