; Authorized actions vs requested actions.

(= (over-authorized-limit)
   (if (> (current-amount) (current-limit)) True False))

(= (excess-amount)
   (if (over-authorized-limit)
       (- (current-amount) (current-limit))
       0))

(= (permission-state full) full)
(= (permission-state limited) limited)
(= (permission-state restricted) restricted)
(= (permission-state suspended) suspended)
(= (permission-state revoked) revoked)

(= (limit-after-high-violation)
   (if (< (current-limit) 100)
       (current-limit)
       100))

(= (limit-after-medium-violation)
   (if (< (current-limit) 200)
       (current-limit)
       (/ (current-limit) 2)))
