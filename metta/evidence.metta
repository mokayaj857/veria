; Evidence quality, missing facts, and contradictions.

(= (confidence-band)
   (if (>= (current-confidence) 90) high-confidence
   (if (>= (current-confidence) 70) medium-confidence
   (if (>= (current-confidence) 40) low-confidence
       insufficient-evidence))))

(= (strong-evidence)
   (if (and (== (current-evidence-verified) True)
            (>= (current-confidence) 90)
            (== (current-conflicting) False))
       True False))

(= (weak-evidence)
   (if (or (== (current-evidence-verified) False)
           (< (current-confidence) 70)
           (== (current-conflicting) True))
       True False))

(= (missing-recipient)
   (if (== (current-recipient-known) False) True False))

(= (evidence-status)
   (if (== (current-conflicting) True) conflicting-evidence
   (if (== (current-evidence-missing) True) missing-evidence
   (if (== (current-evidence-verified) True) verified-evidence
       unverified-evidence))))
