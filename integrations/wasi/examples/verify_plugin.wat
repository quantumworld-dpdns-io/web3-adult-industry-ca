;; Example WAT plugin for credential verification
;; This is a stub demonstrating the WASI 0.3 plugin interface
(module
  (func (export "verify") (param i32 i32) (result i32)
    ;; Stub: always return 1 (valid)
    i32.const 1
  )
  (memory (export "memory") 1)
)
