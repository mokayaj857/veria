; Reputation is one factor, never the whole of trust.

(= (history-penalty)
   (if (> (current-violations) 2) 35
   (if (> (current-violations) 0) 18
   (if (> (current-failed) 5) 10 0))))

(= (success-bonus)
   (if (> (current-successful) 50) 8
   (if (> (current-successful) 10) 4 0)))

(= (severity-rep-delta)
   (if (== (severity) critical) -400
   (if (== (severity) high) -240
   (if (== (severity) medium) -100
   (if (== (severity) low) -40 0)))))

(= (success-rep-delta)
   (if (and (== (violation-type) none) (== (current-failed-this) False)) 10 0))

(= (recommended-rep-delta)
   (if (violation-present) (severity-rep-delta) (success-rep-delta)))
