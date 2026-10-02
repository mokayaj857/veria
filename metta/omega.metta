; Historical facts supplied from Omega memory, then reasoned here.

(= (omega-risk-penalty)
   (if (>= (current-omega-violations) 2) 30
   (if (>= (current-omega-violations) 1) 16 0)))

(= (recent-high-violation)
   (if (and (>= (current-omega-violations) 1)
            (or (== (current-omega-last-severity) high)
                (== (current-omega-last-severity) critical)))
       True False))

(= (should-suspend)
   (if (and (>= (current-omega-violations) 2)
            (or (== (severity) high) (== (severity) critical)))
       True False))
