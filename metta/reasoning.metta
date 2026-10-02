; Top-level VERIA decision procedure. Inspectable and deterministic.

(= (severity)
   (if (== (violation-type) none) none
   (if (== (current-identity) revoked) critical
   (if (and (unauthorized-transfer) (strong-evidence) (>= (current-omega-violations) 2)) critical
   (if (and (unauthorized-transfer) (strong-evidence)) high
   (if (and (unauthorized-transfer) (weak-evidence)) medium
   (if (repeated-failure) medium
       low)))))))

(= (decision)
   (if (== (current-conflicting) True) investigate
   (if (and (== (violation-type) none) (missing-recipient) (not (over-authorized-limit))) challenge
   (if (== (current-identity) revoked) reject
   (if (should-suspend) suspend
   (if (and (recent-high-violation) (over-authorized-limit) (not (> (current-amount) (* (current-limit) 3)))) reject
   (if (and (unauthorized-transfer) (strong-evidence)) slash
   (if (and (unauthorized-transfer) (weak-evidence)) investigate
   (if (and (over-authorized-limit) (== (current-evidence-missing) True)) investigate
   (if (stake-insufficient) reject
   (if (== (current-identity) unverified) challenge
   (if (and (recent-high-violation) (not (over-authorized-limit))) reject
   (if (over-authorized-limit) reject
   (if (> (current-amount) (/ (current-limit) 2)) approve-with-limit
       approve))))))))))))))

(= (recommended-limit)
   (if (or (== (decision) slash) (== (decision) penalize) (== (decision) suspend))
       (limit-after-high-violation)
   (if (== (decision) reject)
       (limit-after-medium-violation)
       (current-limit))))

(= (permission-after)
   (if (== (decision) suspend) suspended
   (if (== (current-identity) revoked) revoked
   (if (or (== (decision) slash) (== (decision) penalize)) restricted
   (if (== (decision) reject) limited
       full)))))

(= (slash-pct-out)
   (if (== (decision) slash) (progressive-slash-pct) 0))

(= (reason-bundle)
   (decision-record
      (decision)
      (tx-risk)
      (confidence-band)
      (current-confidence)
      (trust-score)
      (violation-type)
      (severity)
      (slash-pct-out)
      (recommended-rep-delta)
      (recommended-limit)
      (permission-after)
      (evidence-status)
      (remaining-stake)
      (slash-amount)))
