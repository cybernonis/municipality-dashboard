export const AI_ACTION_LABELS: Record<string, { label: string; icon: string }> = {
  // ═══ Ανακοινώσεις & Επικοινωνία ═══
  CREATE_ANNOUNCEMENT:          { label: 'Δημιουργία Ανακοίνωσης',                    icon: '📢' },
  CREATE_URGENT_ANNOUNCEMENT:   { label: 'Επείγουσα Ανακοίνωση',                      icon: '🚨' },
  CREATE_IMPORTANT_UPDATE:      { label: 'Σημαντική Ενημέρωση',                        icon: '📌' },
  UPDATE_ANNOUNCEMENT:          { label: 'Ενημέρωση Ανακοίνωσης',                     icon: '✏️' },
  DELETE_ANNOUNCEMENT:          { label: 'Διαγραφή Ανακοίνωσης',                      icon: '🗑️' },
  PIN_ANNOUNCEMENT:             { label: 'Καρφίτσωμα Ανακοίνωσης',                    icon: '📌' },
  SEND_BROADCAST:               { label: 'Μαζική Αποστολή',                            icon: '📣' },
  SEND_BROADCAST_NOTIFICATION:  { label: 'Μαζική Ειδοποίηση',                          icon: '📣' },
  SEND_NOTIFICATION:            { label: 'Αποστολή Ειδοποίησης',                       icon: '🔔' },
  SEND_TARGETED_NOTIFICATION:   { label: 'Στοχευμένη Ειδοποίηση',                      icon: '🎯' },
  EMERGENCY_BROADCAST:          { label: 'Έκτακτη Ανακοίνωση',                        icon: '🆘' },
  BROADCAST_EMERGENCY_ALERT:    { label: 'Έκτακτη Ειδοποίηση',                        icon: '🆘' },

  // ═══ Κυκλοφορία & Δρόμοι ═══
  CLOSE_ROAD:                   { label: 'Κλείσιμο Δρόμου',                            icon: '🚧' },
  CREATE_CLOSED_ROAD:           { label: 'Κλείσιμο Δρόμου',                            icon: '🚧' },
  UPDATE_CLOSED_ROAD:           { label: 'Ενημέρωση Κλειστού Δρόμου',                 icon: '🛠️' },
  REOPEN_ROAD:                  { label: 'Άνοιγμα Δρόμου',                             icon: '🛣️' },
  OPEN_ROAD:                    { label: 'Άνοιγμα Δρόμου',                             icon: '🛣️' },
  UPDATE_ROAD_STATUS:           { label: 'Ενημέρωση Κατάστασης Δρόμου',               icon: '🚦' },
  ADD_TRAFFIC_INCIDENT:         { label: 'Προσθήκη Συμβάντος Κυκλοφορίας',            icon: '⚠️' },
  CREATE_DETOUR:                { label: 'Δημιουργία Παράκαμψης',                      icon: '↪️' },
  SCHEDULE_ROAD_WORK:           { label: 'Προγραμματισμός Οδικών Έργων',              icon: '🏗️' },
  REPORT_TRAFFIC_JAM:           { label: 'Αναφορά Κυκλοφοριακής Συμφόρησης',         icon: '🚗' },
  OPTIMIZE_WASTE_ROUTES:        { label: 'Βελτιστοποίηση Δρομολογίων Απορριμμάτων',  icon: '♻️' },
  ACTIVATE_EVACUATION_ROUTES:   { label: 'Ενεργοποίηση Διαδρομών Εκκένωσης',         icon: '🚦' },

  // ═══ Αναφορές ═══
  ASSIGN_REPORT:                { label: 'Ανάθεση Αναφοράς',                           icon: '📋' },
  ASSIGN_CREW:                  { label: 'Ανάθεση σε Συνεργείο',                       icon: '👷' },
  CHANGE_REPORT_STATUS:         { label: 'Αλλαγή Κατάστασης Αναφοράς',               icon: '🔄' },
  CHANGE_REPORT_PRIORITY:       { label: 'Αλλαγή Προτεραιότητας',                     icon: '⚡' },
  ADD_REPORT_COMMENT:           { label: 'Σχόλιο σε Αναφορά',                         icon: '💬' },
  BULK_ASSIGN_REPORTS:          { label: 'Μαζική Ανάθεση Αναφορών',                   icon: '📚' },
  ASSIGN_DEPARTMENT_HEAD:       { label: 'Ορισμός Υπευθύνου Τμήματος',                icon: '👤' },
  RESOLVE_CRISIS_EVENT:         { label: 'Επίλυση Κρίσης',                            icon: '✅' },
  GENERATE_PERFORMANCE_REPORT:  { label: 'Αναφορά Απόδοσης',                          icon: '📈' },
  EXPORT_DATA_REPORT:           { label: 'Εξαγωγή Δεδομένων',                         icon: '📤' },
  SCHEDULE_RECURRING_REPORT:    { label: 'Προγραμματισμός Περιοδικής Αναφοράς',       icon: '⏰' },
  LIST_PENDING_REPORTS:         { label: 'Εκκρεμείς Αναφορές',                        icon: '📋' },
  CLOSE_DUPLICATE_REPORTS:      { label: 'Κλείσιμο Διπλότυπων Αναφορών',             icon: '🔗' },

  // ═══ Τμήματα & Συνεργεία ═══
  CREATE_DEPARTMENT:            { label: 'Δημιουργία Τμήματος',                        icon: '🏢' },
  UPDATE_DEPARTMENT:            { label: 'Ενημέρωση Τμήματος',                        icon: '✏️' },
  GET_DEPARTMENT_PERFORMANCE:   { label: 'Απόδοση Τμήματος',                          icon: '📊' },
  CREATE_CREW:                  { label: 'Δημιουργία Συνεργείου',                      icon: '👥' },
  UPDATE_CREW:                  { label: 'Ενημέρωση Συνεργείου',                      icon: '✏️' },
  GET_CREW_WORKLOAD:            { label: 'Φόρτος Εργασίας Συνεργείου',                icon: '⚖️' },

  // ═══ Συμμετοχή ═══
  CREATE_POLL:                  { label: 'Νέα Δημοσκόπηση',                            icon: '🗳️' },
  CLOSE_POLL:                   { label: 'Κλείσιμο Δημοσκόπησης',                     icon: '🔒' },
  PUBLISH_POLL_RESULTS:         { label: 'Δημοσίευση Αποτελεσμάτων',                  icon: '📊' },

  // ═══ Ραντεβού ═══
  CREATE_APPOINTMENT:           { label: 'Δημιουργία Ραντεβού',                        icon: '📅' },
  CREATE_APPOINTMENT_SLOT:      { label: 'Δημιουργία Ραντεβού',                        icon: '📅' },
  CANCEL_APPOINTMENT:           { label: 'Ακύρωση Ραντεβού',                          icon: '❌' },
  RESCHEDULE_APPOINTMENT:       { label: 'Επαναπρογραμματισμός Ραντεβού',             icon: '🔄' },

  // ═══ IoT ═══
  INSTALL_SENSOR:               { label: 'Εγκατάσταση Αισθητήρα',                     icon: '📡' },
  REMOVE_SENSOR:                { label: 'Αφαίρεση Αισθητήρα',                        icon: '➖' },
  INSTALL_GATEWAY:              { label: 'Εγκατάσταση Gateway',                        icon: '🌐' },
  SET_SENSOR_MAINTENANCE:       { label: 'Συντήρηση Αισθητήρα',                       icon: '🔧' },
  TRIGGER_FLOOD_SIMULATION:     { label: 'Προσομοίωση Πλημμύρας',                     icon: '🌊' },
  ANALYZE_SENSOR_DATA:          { label: 'Ανάλυση Δεδομένων Αισθητήρων',             icon: '📈' },
  GET_IOT_STATUS:               { label: 'Κατάσταση IoT Δικτύου',                     icon: '📡' },
  CONTROL_IOT_DEVICE:           { label: 'Έλεγχος Συσκευής IoT',                      icon: '🎛️' },
  ADD_IOT_SENSOR:               { label: 'Προσθήκη Αισθητήρα',                        icon: '➕' },
  REMOVE_IOT_SENSOR:            { label: 'Αφαίρεση Αισθητήρα',                        icon: '➖' },
  CONFIGURE_IOT_ALERT:          { label: 'Ρύθμιση Ειδοποίησης IoT',                   icon: '⚙️' },
  GET_SENSOR_READINGS:          { label: 'Μετρήσεις Αισθητήρων',                      icon: '📊' },

  // ═══ Κρίσεις ═══
  DECLARE_CRISIS_EVENT:         { label: 'Κήρυξη Κρίσης',                             icon: '🚨' },
  CREATE_CRISIS:                { label: 'Δημιουργία Κρίσης',                          icon: '🚨' },
  LIST_CRISES:                  { label: 'Λίστα Ενεργών Κρίσεων',                     icon: '🆘' },

  // ═══ Πληρωμές ═══
  CREATE_PAYMENT_REQUEST:       { label: 'Αίτημα Πληρωμής',                           icon: '💳' },
  WAIVE_FINE:                   { label: 'Διαγραφή Προστίμου',                        icon: '🆓' },
  REFUND_PAYMENT:               { label: 'Επιστροφή Πληρωμής',                        icon: '💰' },
  ISSUE_REFUND:                 { label: 'Έκδοση Επιστροφής Χρημάτων',                icon: '🏦' },
  GET_REVENUE_REPORT:           { label: 'Αναφορά Εσόδων',                            icon: '💵' },

  // ═══ Αναλυτικά ═══
  GET_STATISTICS:               { label: 'Στατιστικά',                                 icon: '📊' },

  // ═══ Gamification ═══
  CREATE_CUSTOM_BADGE:          { label: 'Δημιουργία Σήματος',                        icon: '🏆' },
  RESET_USER_POINTS:            { label: 'Επαναφορά Πόντων Χρήστη',                   icon: '🔄' },
  ANNOUNCE_LEADERBOARD_WINNERS: { label: 'Ανακοίνωση Νικητών Κατάταξης',             icon: '🥇' },
  AWARD_MANUAL_XP:              { label: 'Χειροκίνητη Απονομή XP',                    icon: '⭐' },
  AWARD_BADGE:                  { label: 'Απονομή Σήματος',                            icon: '🏆' },
  ADJUST_USER_POINTS:           { label: 'Προσαρμογή Πόντων Χρήστη',                  icon: '⭐' },
  PROMOTE_LEADERBOARD:          { label: 'Προβολή Κατάταξης',                         icon: '🥇' },

  // ═══ Σύστημα ═══
  CREATE_USER:                  { label: 'Δημιουργία Χρήστη',                          icon: '👤' },
  UPDATE_USER_ROLE:             { label: 'Αλλαγή Ρόλου Χρήστη',                       icon: '🔑' },
  DELETE_USER:                  { label: 'Διαγραφή Χρήστη',                            icon: '🗑️' },
  RESET_USER_PASSWORD:          { label: 'Επαναφορά Κωδικού',                         icon: '🔐' },
  SEND_USER_INVITATION:         { label: 'Αποστολή Πρόσκλησης',                       icon: '✉️' },
  GET_AUDIT_LOG:                { label: 'Αρχείο Καταγραφής',                          icon: '📜' },
  SYSTEM_BACKUP:                { label: 'Backup Συστήματος',                          icon: '💾' },
  BACKUP_DATABASE:              { label: 'Backup Βάσης Δεδομένων',                    icon: '💾' },
  SYSTEM_HEALTH_CHECK:          { label: 'Έλεγχος Υγείας Συστήματος',                icon: '🩺' },
  CLEAR_CACHE:                  { label: 'Καθαρισμός Cache',                           icon: '🧹' },
  UPDATE_SYSTEM_SETTINGS:       { label: 'Ρυθμίσεις Συστήματος',                      icon: '⚙️' },
  SUMMARIZE_RECENT_ACTIVITY:    { label: 'Σύνοψη Πρόσφατης Δραστηριότητας',          icon: '📜' },
  FORECAST_TRENDS:              { label: 'Πρόβλεψη Τάσεων',                           icon: '🔮' },

  // ═══ Special (δεν εκτελείται — εμφανίζεται μόνο) ═══
  CLARIFICATION_NEEDED:         { label: 'Χρειάζεται Διευκρίνιση',                    icon: '❓' },
};

export function getActionLabel(code: string): string {
  return AI_ACTION_LABELS[code]?.label ?? code;
}

export function getActionIcon(code: string): string {
  return AI_ACTION_LABELS[code]?.icon ?? '⚙️';
}
