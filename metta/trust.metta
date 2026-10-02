; Transparent multi-factor trust. Not a black-box model.

(= (raw-trust)
   (- 100 (+ (identity-penalty (current-identity))
             (history-penalty)
             (omega-risk-penalty)
             (if (over-authorized-limit) 25 0)
             (if (unauthorized-transfer) 44 0)
             (if (stake-insufficient-for-request) 12 0)
             (if (stake-insufficient) 15 0))))

(= (trust-score)
   (if (< (raw-trust) 0) 0
   (if (> (raw-trust) 100) 100 (raw-trust))))

(= (risk-from-trust)
   (if (<= (trust-score) 30) critical
   (if (<= (trust-score) 50) high
   (if (<= (trust-score) 70) medium
       low))))

(= (tx-risk)
   (if (or (== (current-identity) revoked) (should-suspend)) critical
   (if (and (unauthorized-transfer) (strong-evidence)) high
   (if (over-authorized-limit) high
   (if (stake-insufficient-for-request) medium
   (if (== (current-identity) unverified) medium
       (risk-from-trust)))))))
