; VERIA policy constants and identity / stake rules.
; Executed by the MeTTa engine — not duplicated as application logic.

(= (min-stake high-value-transaction) 500)
(= (min-stake transfer) 50)
(= (high-value-threshold) 500)

(= (identity-penalty verified) 0)
(= (identity-penalty unverified) 28)
(= (identity-penalty unknown) 40)
(= (identity-penalty revoked) 85)

(= (identity-reason verified) identity-verified-lowers-risk)
(= (identity-reason unverified) unverified-identity-raises-risk)
(= (identity-reason unknown) unknown-identity-needs-evidence)
(= (identity-reason revoked) revoked-identity-blocks-sensitive-actions)

(= (identity-ok) (if (== (current-identity) revoked) False True))

(= (stake-insufficient)
   (if (< (current-stake) (min-stake transfer)) True False))

(= (stake-insufficient-for-request)
   (if (and (> (current-amount) (high-value-threshold))
            (< (current-stake) (min-stake high-value-transaction)))
       True False))

(= (stake-after-slash $pct)
   (- (current-stake) (/ (* (current-stake) $pct) 100)))
