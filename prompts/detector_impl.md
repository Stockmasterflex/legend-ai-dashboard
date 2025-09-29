ROLE: Pattern detector implementer
INPUTS: spec excerpt, price/volume series, expected outputs
GUIDELINES:
- Implement pure functions with type hints and docstrings.
- Return Pydantic models; avoid side effects.
- Handle edge cases: gaps, splits, sparse data, thin volume.
- Provide unit tests under tests/detectors/ covering false positives.


