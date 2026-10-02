; Recommended slash percentages. MeTTa never moves funds.

(= (base-slash-pct)
   (if (== (severity) critical) 50
   (if (== (severity) high) 30
   (if (== (severity) medium) 10
   (if (== (severity) low) 5 0)))))

(= (progressive-slash-pct)
   (if (and (>= (current-omega-violations) 2)
            (or (== (severity) high) (== (severity) critical)))
       50
   (if (and (>= (current-omega-violations) 1)
            (or (== (severity) high) (== (severity) critical)))
       40
       (base-slash-pct))))

(= (slash-amount)
   (/ (* (current-stake) (slash-pct-out)) 100))

(= (remaining-stake)
   (- (current-stake) (slash-amount)))
