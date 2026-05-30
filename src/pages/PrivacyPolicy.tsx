import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Database, Target, UserCheck, Mail,
  Lock, Eye, RefreshCw, Download, Trash2, AlertCircle, Building2,
} from 'lucide-react';

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-5">
    <h2 className="flex items-center gap-3 text-lg font-bold text-[#1E3A5F] mb-4">
      <span className="w-8 h-8 rounded-lg bg-[#1E3A5F]/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </span>
      {title}
    </h2>
    {children}
  </div>
);

const Right: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
    <span className="w-7 h-7 rounded-lg bg-[#2E86AB]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
      {icon}
    </span>
    <div>
      <p className="font-semibold text-sm text-[#1E3A5F]">{title}</p>
      <p className="text-sm text-gray-500 leading-relaxed mt-0.5">{desc}</p>
    </div>
  </div>
);

const PrivacyPolicy: React.FC = () => {
  const lastUpdated = '30 Μαΐου 2026';

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #162d4a 100%)' }} className="text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-base leading-tight">Δήμος Ηρακλείου</p>
              <p className="text-white/50 text-xs">Smart City Platform</p>
            </div>
            <Link
              to="/login"
              className="ml-auto text-xs text-white/60 hover:text-white border border-white/20 hover:border-white/50 px-3 py-1.5 rounded-lg transition-colors"
            >
              Σύνδεση →
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(246,174,45,0.2)' }}>
              <ShieldCheck className="w-6 h-6" style={{ color: '#F6AE2D' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Πολιτική Απορρήτου</h1>
              <p className="text-white/60 text-sm mt-0.5">Τελευταία ενημέρωση: {lastUpdated}</p>
            </div>
          </div>

          <p className="mt-5 text-white/70 text-sm leading-relaxed max-w-2xl">
            Ο Δήμος Ηρακλείου δεσμεύεται για την προστασία των προσωπικών δεδομένων των πολιτών. Η παρούσα πολιτική
            εξηγεί ποια δεδομένα συλλέγουμε, για ποιον σκοπό και ποια δικαιώματα έχετε βάσει του
            Γενικού Κανονισμού Προστασίας Δεδομένων (ΓΚΠΔ / GDPR 2016/679).
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* 1. Δεδομένα που συλλέγουμε */}
        <Section icon={<Database className="w-4 h-4 text-[#1E3A5F]" />} title="1. Δεδομένα που Συλλέγουμε">
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            Στο πλαίσιο λειτουργίας της πλατφόρμας Smart City Ηρακλείου, συλλέγουμε τα ακόλουθα δεδομένα:
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: 'Στοιχεία ταυτότητας', items: ['Ονοματεπώνυμο', 'Διεύθυνση ηλεκτρονικού ταχυδρομείου'] },
              { label: 'Στοιχεία επικοινωνίας', items: ['Αριθμός τηλεφώνου', 'Διεύθυνση κατοικίας (προαιρετικά)'] },
              { label: 'Αναφορές / Αιτήματα', items: ['Φωτογραφίες, κείμενα', 'Κατηγορία και σοβαρότητα προβλήματος'] },
              { label: 'Τεχνικά δεδομένα', items: ['Γεωγραφική θέση (GPS)', 'Χρόνος υποβολής & συσκευή'] },
            ].map(({ label, items }) => (
              <div key={label} className="bg-[#F0F4F8] rounded-xl p-4">
                <p className="text-xs font-bold text-[#2E86AB] uppercase tracking-wide mb-2">{label}</p>
                <ul className="space-y-1">
                  {items.map(i => (
                    <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F6AE2D] flex-shrink-0" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* 2. Σκοπός επεξεργασίας */}
        <Section icon={<Target className="w-4 h-4 text-[#1E3A5F]" />} title="2. Σκοπός Επεξεργασίας">
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">
            Τα δεδομένα σας υφίστανται επεξεργασία αποκλειστικά για τους παρακάτω σκοπούς,
            που σχετίζονται με τη λειτουργία της Smart City πλατφόρμας του Δήμου Ηρακλείου:
          </p>
          <ul className="space-y-3">
            {[
              { title: 'Διαχείριση αναφορών πολιτών', desc: 'Λήψη, κατηγοριοποίηση και αποστολή αναφορών στα αρμόδια τμήματα για αποκατάσταση.' },
              { title: 'Διαχείριση ραντεβού', desc: 'Κλείσιμο, επιβεβαίωση και ακύρωση ραντεβού με δημοτικές υπηρεσίες.' },
              { title: 'Ενημέρωση & επικοινωνία', desc: 'Αποστολή ανακοινώσεων, εκτάκτων ειδοποιήσεων και ενημερωτικών μηνυμάτων.' },
              { title: 'Βελτίωση υπηρεσιών', desc: 'Ανωνυμοποιημένη ανάλυση δεδομένων για βελτίωση της ποιότητας παροχής υπηρεσιών.' },
              { title: 'Εκπλήρωση νομικών υποχρεώσεων', desc: 'Συμμόρφωση με νομοθεσία για τη λειτουργία ΟΤΑ (Ν. 3463/2006, Ν. 3852/2010).' },
            ].map(({ title, desc }) => (
              <li key={title} className="flex items-start gap-3 text-sm">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#F6AE2D' }} />
                <span><strong className="text-[#1E3A5F]">{title}:</strong>{' '}
                  <span className="text-gray-600">{desc}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-5 p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong>Νομική βάση επεξεργασίας:</strong> Η επεξεργασία βασίζεται στο άρθρο 6 παρ. 1(β) ΓΚΠΔ
              (εκτέλεση σύμβασης / παροχή υπηρεσιών), 6 παρ. 1(γ) (εκπλήρωση νομικής υποχρέωσης) και 6 παρ. 1(ε)
              (εκπλήρωση καθήκοντος δημοσίου συμφέροντος).
            </p>
          </div>
        </Section>

        {/* 3. Αποθήκευση & Ασφάλεια */}
        <Section icon={<Lock className="w-4 h-4 text-[#1E3A5F]" />} title="3. Αποθήκευση & Ασφάλεια Δεδομένων">
          <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
            <p>
              Τα δεδομένα σας αποθηκεύονται σε ασφαλείς διακομιστές (<strong className="text-[#1E3A5F]">Supabase / PostgreSQL</strong>)
              με κρυπτογράφηση κατά τη μεταφορά (TLS 1.3) και ηρεμία (AES-256). Η πρόσβαση
              περιορίζεται αυστηρά στο εξουσιοδοτημένο προσωπικό του Δήμου βάσει αρχής ελάχιστης πρόσβασης.
            </p>
            <p>
              Τα προσωπικά δεδομένα <strong className="text-[#1E3A5F]">δεν διαβιβάζονται σε τρίτες χώρες</strong> εκτός ΕΟΧ
              και δεν χρησιμοποιούνται για εμπορικούς σκοπούς ή διαφήμιση.
            </p>
            <p>
              <strong className="text-[#1E3A5F]">Χρόνος τήρησης:</strong> Τα δεδομένα τηρούνται για όσο διάστημα είναι απαραίτητο
              για τον σκοπό επεξεργασίας και σύμφωνα με τις νόμιμες υποχρεώσεις (έως 5 έτη για δημοτικά αρχεία),
              εκτός αν ζητηθεί νωρίτερη διαγραφή.
            </p>
          </div>
        </Section>

        {/* 4. Δικαιώματα GDPR */}
        <Section icon={<UserCheck className="w-4 h-4 text-[#1E3A5F]" />} title="4. Τα Δικαιώματά Σας (ΓΚΠΔ)">
          <p className="text-sm text-gray-600 mb-4">
            Βάσει του ΓΚΠΔ (Κανονισμός ΕΕ 2016/679), έχετε τα ακόλουθα δικαιώματα:
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Right
              icon={<Eye className="w-3.5 h-3.5 text-[#2E86AB]" />}
              title="Δικαίωμα Πρόσβασης (Άρθρο 15)"
              desc="Μπορείτε να ζητήσετε αντίγραφο των προσωπικών δεδομένων που τηρούμε για εσάς."
            />
            <Right
              icon={<RefreshCw className="w-3.5 h-3.5 text-[#2E86AB]" />}
              title="Δικαίωμα Διόρθωσης (Άρθρο 16)"
              desc="Μπορείτε να ζητήσετε τη διόρθωση ανακριβών ή ελλιπών δεδομένων."
            />
            <Right
              icon={<Trash2 className="w-3.5 h-3.5 text-[#2E86AB]" />}
              title="Δικαίωμα Διαγραφής (Άρθρο 17)"
              desc="«Δικαίωμα στη λήθη» — διαγραφή δεδομένων εφόσον δεν υπάρχει νόμιμος λόγος διατήρησης."
            />
            <Right
              icon={<Download className="w-3.5 h-3.5 text-[#2E86AB]" />}
              title="Δικαίωμα Φορητότητας (Άρθρο 20)"
              desc="Παραλαβή των δεδομένων σας σε δομημένη, κοινώς χρησιμοποιούμενη μορφή (JSON/CSV)."
            />
            <Right
              icon={<Lock className="w-3.5 h-3.5 text-[#2E86AB]" />}
              title="Δικαίωμα Περιορισμού (Άρθρο 18)"
              desc="Περιορισμός της επεξεργασίας κατά την αμφισβήτηση ακρίβειας ή νομιμότητας."
            />
            <Right
              icon={<AlertCircle className="w-3.5 h-3.5 text-[#2E86AB]" />}
              title="Δικαίωμα Εναντίωσης (Άρθρο 21)"
              desc="Εναντίωση στην επεξεργασία βάσει νόμιμου συμφέροντος ή για σκοπούς δημοσίου συμφέροντος."
            />
          </div>
          <p className="text-xs text-gray-500 mt-4 leading-relaxed">
            Για την άσκηση των δικαιωμάτων σας, απευθυνθείτε στον Υπεύθυνο Προστασίας Δεδομένων (ΥΠΔ/DPO).
            Απαντούμε εντός <strong>30 ημερών</strong>. Έχετε επίσης το δικαίωμα υποβολής καταγγελίας στην
            Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (<a href="https://www.dpa.gr" target="_blank" rel="noopener noreferrer" className="text-[#2E86AB] underline">www.dpa.gr</a>).
          </p>
        </Section>

        {/* 5. Επικοινωνία DPO */}
        <Section icon={<Mail className="w-4 h-4 text-[#1E3A5F]" />} title="5. Επικοινωνία — Υπεύθυνος Προστασίας Δεδομένων">
          <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2E86AB] rounded-xl p-5 text-white">
            <p className="text-sm text-white/80 mb-4 leading-relaxed">
              Για ερωτήματα σχετικά με την επεξεργασία δεδομένων σας ή για άσκηση δικαιωμάτων, επικοινωνήστε:
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-white/70 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/50">Φορέας</p>
                  <p className="font-semibold text-sm">Δήμος Ηρακλείου Κρήτης</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-white/70 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/50">Email ΥΠΔ</p>
                  <a href="mailto:dpo@heraklion.gr" className="font-semibold text-sm text-[#F6AE2D] hover:underline">
                    dpo@heraklion.gr
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-white/70 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/50">Νομικό πλαίσιο</p>
                  <p className="text-sm">ΓΚΠΔ (EU) 2016/679 · Ν. 4624/2019</p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Cookies */}
        <Section icon={<Database className="w-4 h-4 text-[#1E3A5F]" />} title="6. Cookies & Τοπική Αποθήκευση">
          <p className="text-sm text-gray-600 leading-relaxed">
            Η εφαρμογή χρησιμοποιεί <strong className="text-[#1E3A5F]">localStorage</strong> αποκλειστικά για:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            {[
              'Αποθήκευση token πρόσβασης (session management) — διαγράφεται κατά την αποσύνδεση.',
              'Προτιμήσεις εφαρμογής (π.χ. κατάσταση sidebar) — καμία προσωπική πληροφορία.',
              'Ειδοποιήσεις WebSocket (local cache 50 εγγραφών, χωρίς αποστολή σε servers).',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#2E86AB' }} />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-gray-600">
            Δεν χρησιμοποιούμε cookies τρίτων, tracking pixels ή εργαλεία analytics τρίτων.
          </p>
        </Section>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-4">
        <div className="max-w-4xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Δήμος Ηρακλείου — Smart City Platform. Με επιφύλαξη παντός δικαιώματος.
          </p>
          <p className="text-xs text-gray-400">
            Τελευταία αναθεώρηση: {lastUpdated}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
