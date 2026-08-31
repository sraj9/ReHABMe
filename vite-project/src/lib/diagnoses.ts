// Physiotherapy diagnosis catalogue for the Primary Diagnosis field.
// Grouped adult + pediatric lists supplied by the clinic; the form still
// accepts free text for anything not listed.

export interface DiagnosisGroup {
  group: string
  diagnoses: string[]
}

export const DIAGNOSIS_GROUPS: DiagnosisGroup[] = [
  {
    group: "Adult: Musculoskeletal & Orthopedic \u2014 Spine",
    diagnoses: [
      "Cervicalgia / Neck Pain",
      "Cervical Radiculopathy",
      "Lumbar Strain / Sprain",
      "Lumbar Disc Herniation / Prolapse (IVDP)",
      "Lumbar Radiculopathy / Sciatica",
      "Spinal Stenosis (Cervical / Lumbar)",
      "Spondylosis / Spondylolisthesis",
      "Postural Kyphosis / Scoliosis",
      "Thoracic Outlet Syndrome (TOS)",
      "Sacroiliac (SI) Joint Dysfunction",
      "Whiplash Associated Disorder (WAD)",
    ],
  },
  {
    group: "Adult: Musculoskeletal & Orthopedic \u2014 Upper Extremity",
    diagnoses: [
      "Adhesive Capsulitis (Frozen Shoulder)",
      "Rotator Cuff Tendinopathy / Tear",
      "Subacromial Impingement Syndrome",
      "Shoulder Instability / Dislocation",
      "Lateral Epicondylalgia (Tennis Elbow)",
      "Medial Epicondylalgia (Golfer's Elbow)",
      "Carpal Tunnel Syndrome (CTS)",
      "De Quervain's Tenosynovitis",
      "Wrist / Hand Sprain or Strain",
      "Trigger Finger",
    ],
  },
  {
    group: "Adult: Musculoskeletal & Orthopedic \u2014 Lower Extremity",
    diagnoses: [
      "Hip Osteoarthritis",
      "Greater Trochanteric Pain Syndrome (GTPS) / Hip Bursitis",
      "Knee Osteoarthritis",
      "Patellofemoral Pain Syndrome (PFPS)",
      "Patellar Tendinopathy (Jumper's Knee)",
      "ACL / PCL / MCL / LCL Sprain or Tear",
      "Meniscal Tear (Medial / Lateral)",
      "Shin Splints (Medial Tibial Stress Syndrome)",
      "Achilles Tendinopathy / Tendinitis",
      "Plantar Fasciitis",
      "Ankle Inversion / Eversion Sprain",
    ],
  },
  {
    group: "Adult: Neurological \u2014 Central & Peripheral Nervous System",
    diagnoses: [
      "Stroke / Cerebrovascular Accident (CVA) (Hemiplegia / Hemiparesis)",
      "Parkinson's Disease",
      "Traumatic Brain Injury (TBI)",
      "Spinal Cord Injury (SCI) (Paraplegia / Tetraplegia)",
      "Multiple Sclerosis (MS)",
      "Guillain-Barr\u00e9 Syndrome (GBS)",
      "Peripheral Neuropathy",
      "Facial Nerve Palsy (Bell's Palsy)",
      "Motor Neuron Disease (MND / ALS)",
    ],
  },
  {
    group: "Adult: Post-Surgical & Traumatic Rehabilitation \u2014 Post-Operative Management",
    diagnoses: [
      "Total Knee Arthroplasty (TKA) Rehabilitation",
      "Total Hip Arthroplasty (THA) Rehabilitation",
      "Post-Spinal Surgery (Discectomy / Laminectomy / Fusion)",
      "Post-Fracture Fixation / Cast Removal Stiffness",
      "ACL / Meniscus Post-Operative Repair",
      "Rotator Cuff Post-Surgical Repair",
      "Tendon Repair Rehabilitation (Achilles / Flexor tendons)",
      "Post-Amputation Rehabilitation & Prosthetic Training",
    ],
  },
  {
    group: "Adult: Cardiopulmonary & Respiratory \u2014 Pulmonary & Cardiac Rehab",
    diagnoses: [
      "Chronic Obstructive Pulmonary Disease (COPD)",
      "Bronchial Asthma Rehabilitation",
      "Post-Cardio-Thoracic Surgery Rehab (CABG / Valve Replacement)",
      "Bronchiectasis",
      "Deconditioning / Prolonged Bed Rest Weakness",
    ],
  },
  {
    group: "Adult: Specialized & Chronic Pain \u2014 Vestibular, Pelvic & Systemic",
    diagnoses: [
      "Benign Paroxysmal Positional Vertigo (BPPV) / Vestibular Hypofunction",
      "Temporomandibular Joint (TMJ) Dysfunction",
      "Fibromyalgia / Chronic Generalized Pain Syndrome",
      "Myofascial Pain Syndrome (MPS)",
      "Pelvic Floor Dysfunction / Urinary Incontinence",
      "Lymphedema",
    ],
  },
  {
    group: "Pediatric: Pediatric Neuromuscular & Congenital \u2014 Neurological & Muscle Disorders",
    diagnoses: [
      "Cerebral Palsy (Spastic, Dyskinetic, Ataxic, Mixed)",
      "Spina Bifida / Myelomeningocele",
      "Muscular Dystrophy (Duchenne, Becker, Congenital)",
      "Spinal Muscular Atrophy (SMA)",
      "Brachial Plexus Birth Palsy (Erb's Palsy / Klumpke's Palsy)",
      "Arthrogryposis Multiplex Congenita (AMC)",
    ],
  },
  {
    group: "Pediatric: Pediatric Developmental & Genetic \u2014 Motor & Genetic Syndromes",
    diagnoses: [
      "Gross Motor Developmental Delay",
      "Developmental Coordination Disorder (DCD / Dyspraxia)",
      "Hypotonia (Benign Congenital / Floppy Infant Syndrome)",
      "Down Syndrome (Trisomy 21) & Associated Hypermobility",
      "Autism Spectrum Disorder (ASD) Motor Impairments",
      "Rett Syndrome",
    ],
  },
  {
    group: "Pediatric: Pediatric Orthopedic & Postural \u2014 Congenital & Growth-Related Orthopedics",
    diagnoses: [
      "Congenital Muscular Torticollis (CMT) & Plagiocephaly",
      "Congenital Talipes Equinovarus (CTEV / Clubfoot)",
      "Developmental Dysplasia of the Hip (DDH)",
      "Idiopathic Toe Walking (ITW)",
      "Juvenile Idiopathic Arthritis (JIA)",
      "Pediatric Scoliosis / Kyphosis",
      "Genu Varum (Bowlegs) / Genu Valgum (Knock-Knees)",
      "Sever's Disease (Calcaneal Apophysitis)",
      "Osgood-Schlatter Disease (Tibial Tubercle Apophysitis)",
      "Slipped Capital Femoral Epiphysis (SCFE) / Legg-Calv\u00e9-Perthes Disease",
    ],
  },
  {
    group: "Pediatric: Pediatric Cardiorespiratory & Specialized \u2014 Respiratory & Neonatal Care",
    diagnoses: [
      "Cystic Fibrosis (Pediatric Airway Clearance)",
      "Bronchopulmonary Dysplasia (BPD)",
      "High-Risk Infant / Neonatal Follow-Up (Prematurity-related motor delay)",
    ],
  },
]

export const ALL_DIAGNOSES: string[] = DIAGNOSIS_GROUPS.flatMap(g => g.diagnoses)
