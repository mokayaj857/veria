; Violation candidates. Failure is not automatically malice.

(= (unauthorized-transfer)
   (if (and (== (current-request-type) transfer) (over-authorized-limit))
       True False))

(= (excessive-transaction)
   (if (and (over-authorized-limit) (> (excess-amount) (current-limit)))
       True False))

(= (identity-mismatch)
   (if (== (current-identity) revoked) True False))

(= (repeated-failure)
   (if (and (> (current-failed) 8) (> (current-failed) (current-successful)))
       True False))

(= (violation-type)
   (if (== (current-identity) revoked) identity-mismatch
   (if (== (current-invalid-signature) True) invalid-signature
   (if (unauthorized-transfer) unauthorized-transfer
   (if (excessive-transaction) excessive-transaction
   (if (and (== (current-suspicious) True) (over-authorized-limit)) suspicious-behavior
   (if (repeated-failure) repeated-failure
       none)))))))

(= (violation-present)
   (if (== (violation-type) none) False True))
