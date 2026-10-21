// DRAFT: Reference data are informative laboratory-specific examples, not universal norms.
// IMPORTANT: No clinical approval; never silently populate a patient's missing lab limits.
// Public terminology (no patient data). Review changes through a versioned clinical QA process.
export const LAB_CATALOG_VERSION = '2026-10-20-draft-2'
export const LAB_CLINICAL_APPROVAL = false
export const LAB_ANALYTES = Object.freeze([
  {
    "id": "hemoglobin",
    "group": "cbc",
    "specimen": "blood",
    "unit": "g/dL",
    "names": {
      "en": "Hemoglobin",
      "ru": "Гемоглобин",
      "es": "Hemoglobina"
    },
    "aliases": [
      "HGB",
      "Hb",
      "Haemoglobin",
      "Гемоглобин Hb"
    ]
  },
  {
    "id": "hematocrit",
    "group": "cbc",
    "specimen": "blood",
    "unit": "%",
    "names": {
      "en": "Hematocrit",
      "ru": "Гематокрит",
      "es": "Hematocrito"
    },
    "aliases": [
      "HCT",
      "PCV",
      "Гематокрит HCT"
    ]
  },
  {
    "id": "rbc",
    "group": "cbc",
    "specimen": "blood",
    "unit": "10^12/L",
    "names": {
      "en": "Red blood cell count",
      "ru": "Эритроциты",
      "es": "Eritrocitos"
    },
    "aliases": [
      "RBC",
      "Red Blood Count",
      "Erythrocytes",
      "Эритроциты RBC",
      "Recuento de eritrocitos"
    ]
  },
  {
    "id": "wbc",
    "group": "cbc",
    "specimen": "blood",
    "unit": "10^9/L",
    "names": {
      "en": "White blood cell count",
      "ru": "Лейкоциты",
      "es": "Leucocitos"
    },
    "aliases": [
      "WBC",
      "Leukocytes",
      "Leucocytes",
      "Лейкоциты WBC",
      "Recuento de leucocitos"
    ]
  },
  {
    "id": "platelets",
    "group": "cbc",
    "specimen": "blood",
    "unit": "10^9/L",
    "names": {
      "en": "Platelet count",
      "ru": "Тромбоциты",
      "es": "Plaquetas"
    },
    "aliases": [
      "PLT",
      "Platelets",
      "Thrombocytes",
      "Тромбоциты PLT"
    ]
  },
  {
    "id": "mcv",
    "group": "cbc",
    "specimen": "blood",
    "unit": "fL",
    "names": {
      "en": "Mean corpuscular volume",
      "ru": "Средний объём эритроцита",
      "es": "Volumen corpuscular medio"
    },
    "aliases": [
      "MCV",
      "Средний объем эритроцита"
    ]
  },
  {
    "id": "mch",
    "group": "cbc",
    "specimen": "blood",
    "unit": "pg",
    "names": {
      "en": "Mean corpuscular hemoglobin",
      "ru": "Среднее содержание Hb в эритроците",
      "es": "Hemoglobina corpuscular media"
    },
    "aliases": [
      "MCH"
    ]
  },
  {
    "id": "mchc",
    "group": "cbc",
    "specimen": "blood",
    "unit": "g/dL",
    "names": {
      "en": "Mean corpuscular hemoglobin concentration",
      "ru": "Средняя концентрация Hb",
      "es": "Concentración media de hemoglobina corpuscular"
    },
    "aliases": [
      "MCHC"
    ]
  },
  {
    "id": "rdw",
    "group": "cbc",
    "specimen": "blood",
    "unit": "%",
    "names": {
      "en": "Red cell distribution width",
      "ru": "Ширина распределения эритроцитов",
      "es": "Amplitud de distribución eritrocitaria"
    },
    "aliases": [
      "RDW",
      "RDW-CV",
      "RDW CV"
    ]
  },
  {
    "id": "neutrophils_abs",
    "group": "cbc",
    "specimen": "blood",
    "unit": "10^9/L",
    "names": {
      "en": "Absolute neutrophils",
      "ru": "Нейтрофилы абсолютные",
      "es": "Neutrófilos absolutos"
    },
    "aliases": [
      "ANC",
      "Absolute neutrophil count",
      "Нейтрофилы абс."
    ]
  },
  {
    "id": "lymphocytes_abs",
    "group": "cbc",
    "specimen": "blood",
    "unit": "10^9/L",
    "names": {
      "en": "Absolute lymphocytes",
      "ru": "Лимфоциты абсолютные",
      "es": "Linfocitos absolutos"
    },
    "aliases": [
      "ALC",
      "Absolute lymphocyte count",
      "Лимфоциты абс."
    ]
  },
  {
    "id": "ferritin",
    "group": "iron",
    "specimen": "serum",
    "unit": "ng/mL",
    "names": {
      "en": "Ferritin",
      "ru": "Ферритин",
      "es": "Ferritina"
    },
    "aliases": [
      "Serum ferritin",
      "Ферритин сывороточный"
    ]
  },
  {
    "id": "iron",
    "group": "iron",
    "specimen": "serum",
    "unit": "µmol/L",
    "names": {
      "en": "Serum iron",
      "ru": "Железо сывороточное",
      "es": "Hierro sérico"
    },
    "aliases": [
      "Serum Fe",
      "Iron serum",
      "Железо (сыворотка)"
    ]
  },
  {
    "id": "transferrin",
    "group": "iron",
    "specimen": "serum",
    "unit": "g/L",
    "names": {
      "en": "Transferrin",
      "ru": "Трансферрин",
      "es": "Transferrina"
    },
    "aliases": [
      "Serum transferrin"
    ]
  },
  {
    "id": "tibc",
    "group": "iron",
    "specimen": "serum",
    "unit": "µmol/L",
    "names": {
      "en": "Total iron binding capacity",
      "ru": "ОЖСС",
      "es": "Capacidad total de fijación de hierro"
    },
    "aliases": [
      "TIBC",
      "ОЖСС (железо)"
    ]
  },
  {
    "id": "transferrin_saturation",
    "group": "iron",
    "specimen": "serum",
    "unit": "%",
    "names": {
      "en": "Transferrin saturation",
      "ru": "Насыщение трансферрина",
      "es": "Saturación de transferrina"
    },
    "aliases": [
      "TSAT",
      "Transferrin saturation %",
      "Коэффициент насыщения трансферрина"
    ]
  },
  {
    "id": "glucose",
    "group": "glucose",
    "specimen": "plasma",
    "unit": "mmol/L",
    "names": {
      "en": "Blood glucose",
      "ru": "Глюкоза крови",
      "es": "Glucosa en sangre"
    },
    "aliases": [
      "Glucose",
      "Glucose plasma",
      "Глюкоза",
      "Glucosa"
    ]
  },
  {
    "id": "hba1c",
    "group": "glucose",
    "specimen": "blood",
    "unit": "%",
    "names": {
      "en": "HbA1c",
      "ru": "Гликированный гемоглобин",
      "es": "Hemoglobina glicosilada"
    },
    "aliases": [
      "A1c",
      "Glycated hemoglobin",
      "Hemoglobin A1c",
      "Гликированный Hb"
    ]
  },
  {
    "id": "insulin",
    "group": "glucose",
    "specimen": "serum",
    "unit": "mIU/L",
    "names": {
      "en": "Insulin",
      "ru": "Инсулин",
      "es": "Insulina"
    },
    "aliases": [
      "Fasting insulin",
      "Инсулин натощак"
    ]
  },
  {
    "id": "c_peptide",
    "group": "glucose",
    "specimen": "serum",
    "unit": "ng/mL",
    "names": {
      "en": "C-peptide",
      "ru": "С-пептид",
      "es": "Péptido C"
    },
    "aliases": [
      "C peptide",
      "C-пептид"
    ]
  },
  {
    "id": "cholesterol_total",
    "group": "lipids",
    "specimen": "serum",
    "unit": "mmol/L",
    "names": {
      "en": "Total cholesterol",
      "ru": "Холестерин общий",
      "es": "Colesterol total"
    },
    "aliases": [
      "Cholesterol total",
      "Общий холестерин",
      "Colesterol"
    ]
  },
  {
    "id": "ldl",
    "group": "lipids",
    "specimen": "serum",
    "unit": "mmol/L",
    "names": {
      "en": "LDL cholesterol",
      "ru": "Холестерин ЛПНП",
      "es": "Colesterol LDL"
    },
    "aliases": [
      "LDL",
      "LDL-C",
      "ЛПНП",
      "LDL cholesterol calculated"
    ]
  },
  {
    "id": "hdl",
    "group": "lipids",
    "specimen": "serum",
    "unit": "mmol/L",
    "names": {
      "en": "HDL cholesterol",
      "ru": "Холестерин ЛПВП",
      "es": "Colesterol HDL"
    },
    "aliases": [
      "HDL",
      "HDL-C",
      "ЛПВП"
    ]
  },
  {
    "id": "triglycerides",
    "group": "lipids",
    "specimen": "serum",
    "unit": "mmol/L",
    "names": {
      "en": "Triglycerides",
      "ru": "Триглицериды",
      "es": "Triglicéridos"
    },
    "aliases": [
      "TG",
      "ТГ"
    ]
  },
  {
    "id": "apob",
    "group": "lipids",
    "specimen": "serum",
    "unit": "g/L",
    "names": {
      "en": "Apolipoprotein B",
      "ru": "Аполипопротеин B",
      "es": "Apolipoproteína B"
    },
    "aliases": [
      "ApoB",
      "Apo B"
    ]
  },
  {
    "id": "lpa",
    "group": "lipids",
    "specimen": "serum",
    "unit": "nmol/L",
    "names": {
      "en": "Lipoprotein(a)",
      "ru": "Липопротеин(a)",
      "es": "Lipoproteína(a)"
    },
    "aliases": [
      "Lp(a)",
      "Lipoprotein a"
    ]
  },
  {
    "id": "alt",
    "group": "liver",
    "specimen": "serum",
    "unit": "U/L",
    "names": {
      "en": "Alanine aminotransferase",
      "ru": "АЛТ",
      "es": "Alanina aminotransferasa"
    },
    "aliases": [
      "ALT",
      "SGPT",
      "АЛАТ",
      "Alanine transaminase"
    ]
  },
  {
    "id": "ast",
    "group": "liver",
    "specimen": "serum",
    "unit": "U/L",
    "names": {
      "en": "Aspartate aminotransferase",
      "ru": "АСТ",
      "es": "Aspartato aminotransferasa"
    },
    "aliases": [
      "AST",
      "SGOT",
      "АСАТ",
      "Aspartate transaminase"
    ]
  },
  {
    "id": "alp",
    "group": "liver",
    "specimen": "plasma",
    "unit": "U/L",
    "names": {
      "en": "Alkaline phosphatase",
      "ru": "Щелочная фосфатаза",
      "es": "Fosfatasa alcalina"
    },
    "aliases": [
      "ALP",
      "ЩФ",
      "Щелочная фосфатаза ALP"
    ]
  },
  {
    "id": "ggt",
    "group": "liver",
    "specimen": "serum",
    "unit": "U/L",
    "names": {
      "en": "Gamma-glutamyl transferase",
      "ru": "ГГТ",
      "es": "Gamma-glutamil transferasa"
    },
    "aliases": [
      "GGT",
      "GGTP",
      "ГГТП"
    ]
  },
  {
    "id": "bilirubin_total",
    "group": "liver",
    "specimen": "serum",
    "unit": "µmol/L",
    "names": {
      "en": "Total bilirubin",
      "ru": "Билирубин общий",
      "es": "Bilirrubina total"
    },
    "aliases": [
      "TBIL",
      "Общий билирубин"
    ]
  },
  {
    "id": "bilirubin_direct",
    "group": "liver",
    "specimen": "serum",
    "unit": "µmol/L",
    "names": {
      "en": "Direct bilirubin",
      "ru": "Билирубин прямой",
      "es": "Bilirrubina directa"
    },
    "aliases": [
      "DBIL",
      "Конъюгированный билирубин"
    ]
  },
  {
    "id": "albumin",
    "group": "liver",
    "specimen": "serum",
    "unit": "g/L",
    "names": {
      "en": "Albumin",
      "ru": "Альбумин",
      "es": "Albúmina"
    },
    "aliases": [
      "Serum albumin"
    ]
  },
  {
    "id": "total_protein",
    "group": "liver",
    "specimen": "serum",
    "unit": "g/L",
    "names": {
      "en": "Total protein",
      "ru": "Общий белок",
      "es": "Proteínas totales"
    },
    "aliases": [
      "Serum total protein",
      "Белок общий"
    ]
  },
  {
    "id": "creatinine",
    "group": "kidney",
    "specimen": "serum",
    "unit": "µmol/L",
    "names": {
      "en": "Creatinine",
      "ru": "Креатинин",
      "es": "Creatinina"
    },
    "aliases": [
      "Serum creatinine",
      "Креатинин сывороточный"
    ]
  },
  {
    "id": "egfr",
    "group": "kidney",
    "specimen": "serum",
    "unit": "mL/min/1.73m2",
    "names": {
      "en": "Estimated GFR",
      "ru": "Расчётная СКФ",
      "es": "Filtrado glomerular estimado"
    },
    "aliases": [
      "eGFR",
      "СКФ",
      "рСКФ"
    ]
  },
  {
    "id": "urea",
    "group": "kidney",
    "specimen": "serum",
    "unit": "mmol/L",
    "names": {
      "en": "Urea",
      "ru": "Мочевина",
      "es": "Urea"
    },
    "aliases": [
      "Мочевина крови"
    ]
  },
  {
    "id": "bun",
    "group": "kidney",
    "specimen": "serum",
    "unit": "mg/dL",
    "names": {
      "en": "Blood urea nitrogen",
      "ru": "Азот мочевины крови",
      "es": "Nitrógeno ureico en sangre"
    },
    "aliases": [
      "BUN",
      "Urea nitrogen"
    ]
  },
  {
    "id": "uric_acid",
    "group": "kidney",
    "specimen": "serum",
    "unit": "µmol/L",
    "names": {
      "en": "Uric acid",
      "ru": "Мочевая кислота",
      "es": "Ácido úrico"
    },
    "aliases": [
      "Urate",
      "Мочевая кислота сывороточная"
    ]
  },
  {
    "id": "sodium",
    "group": "electrolytes",
    "specimen": "serum",
    "unit": "mmol/L",
    "names": {
      "en": "Sodium",
      "ru": "Натрий",
      "es": "Sodio"
    },
    "aliases": [
      "Na",
      "Na+",
      "Натрий Na"
    ]
  },
  {
    "id": "potassium",
    "group": "electrolytes",
    "specimen": "serum",
    "unit": "mmol/L",
    "names": {
      "en": "Potassium",
      "ru": "Калий",
      "es": "Potasio"
    },
    "aliases": [
      "K+",
      "K",
      "Калий K"
    ]
  },
  {
    "id": "chloride",
    "group": "electrolytes",
    "specimen": "serum",
    "unit": "mmol/L",
    "names": {
      "en": "Chloride",
      "ru": "Хлориды",
      "es": "Cloruro"
    },
    "aliases": [
      "Cl-",
      "Chlorides",
      "Хлор"
    ]
  },
  {
    "id": "bicarbonate",
    "group": "electrolytes",
    "specimen": "serum",
    "unit": "mmol/L",
    "names": {
      "en": "Bicarbonate",
      "ru": "Бикарбонат",
      "es": "Bicarbonato"
    },
    "aliases": [
      "HCO3",
      "Total CO2",
      "CO2 total"
    ]
  },
  {
    "id": "calcium_total",
    "group": "electrolytes",
    "specimen": "serum",
    "unit": "mmol/L",
    "names": {
      "en": "Total calcium",
      "ru": "Кальций общий",
      "es": "Calcio total"
    },
    "aliases": [
      "Calcium",
      "Ca total",
      "Кальций"
    ]
  },
  {
    "id": "magnesium",
    "group": "electrolytes",
    "specimen": "serum",
    "unit": "mmol/L",
    "names": {
      "en": "Magnesium",
      "ru": "Магний",
      "es": "Magnesio"
    },
    "aliases": [
      "Mg",
      "Магний Mg"
    ]
  },
  {
    "id": "phosphate",
    "group": "electrolytes",
    "specimen": "serum",
    "unit": "mmol/L",
    "names": {
      "en": "Phosphate",
      "ru": "Фосфат",
      "es": "Fosfato"
    },
    "aliases": [
      "Phosphorus",
      "Фосфор неорганический"
    ]
  },
  {
    "id": "tsh",
    "group": "thyroid",
    "specimen": "serum",
    "unit": "mIU/L",
    "names": {
      "en": "Thyroid stimulating hormone",
      "ru": "ТТГ",
      "es": "Hormona estimulante tiroidea"
    },
    "aliases": [
      "TSH",
      "Тиреотропный гормон",
      "Tirotropina"
    ]
  },
  {
    "id": "free_t4",
    "group": "thyroid",
    "specimen": "serum",
    "unit": "pmol/L",
    "names": {
      "en": "Free T4",
      "ru": "Т4 свободный",
      "es": "T4 libre"
    },
    "aliases": [
      "FT4",
      "Free thyroxine",
      "Свободный тироксин"
    ]
  },
  {
    "id": "free_t3",
    "group": "thyroid",
    "specimen": "serum",
    "unit": "pmol/L",
    "names": {
      "en": "Free T3",
      "ru": "Т3 свободный",
      "es": "T3 libre"
    },
    "aliases": [
      "FT3",
      "Free triiodothyronine",
      "Свободный трийодтиронин"
    ]
  },
  {
    "id": "vitamin_b12",
    "group": "nutrition",
    "specimen": "serum",
    "unit": "pmol/L",
    "names": {
      "en": "Vitamin B12",
      "ru": "Витамин B12",
      "es": "Vitamina B12"
    },
    "aliases": [
      "B12",
      "Cobalamin",
      "Кобаламин"
    ]
  },
  {
    "id": "folate",
    "group": "nutrition",
    "specimen": "serum",
    "unit": "nmol/L",
    "names": {
      "en": "Folate",
      "ru": "Фолаты",
      "es": "Folato"
    },
    "aliases": [
      "Folic acid",
      "Фолиевая кислота"
    ]
  },
  {
    "id": "vitamin_d_25oh",
    "group": "nutrition",
    "specimen": "serum",
    "unit": "nmol/L",
    "names": {
      "en": "25-OH vitamin D",
      "ru": "25-ОН витамин D",
      "es": "25-OH vitamina D"
    },
    "aliases": [
      "25(OH)D",
      "25 hydroxy vitamin D",
      "25-гидроксивитамин D"
    ]
  },
  {
    "id": "crp",
    "group": "inflammation",
    "specimen": "serum",
    "unit": "mg/L",
    "names": {
      "en": "C-reactive protein",
      "ru": "С-реактивный белок",
      "es": "Proteína C reactiva"
    },
    "aliases": [
      "CRP",
      "СРБ"
    ]
  },
  {
    "id": "hs_crp",
    "group": "inflammation",
    "specimen": "serum",
    "unit": "mg/L",
    "names": {
      "en": "High-sensitivity CRP",
      "ru": "Высокочувствительный СРБ",
      "es": "PCR ultrasensible"
    },
    "aliases": [
      "hs-CRP",
      "hsCRP",
      "вч-СРБ"
    ]
  },
  {
    "id": "esr",
    "group": "inflammation",
    "specimen": "blood",
    "unit": "mm/h",
    "names": {
      "en": "Erythrocyte sedimentation rate",
      "ru": "СОЭ",
      "es": "Velocidad de sedimentación globular"
    },
    "aliases": [
      "ESR",
      "Sedimentation rate",
      "Скорость оседания эритроцитов",
      "VSG"
    ]
  },
  {
    "id": "urine_acr",
    "group": "urinalysis",
    "specimen": "urine",
    "unit": "mg/mmol",
    "names": {
      "en": "Urine albumin-creatinine ratio",
      "ru": "Альбумин/креатинин мочи",
      "es": "Relación albúmina/creatinina en orina"
    },
    "aliases": [
      "UACR",
      "ACR urine",
      "АКР мочи"
    ]
  },
  {
    "id": "urine_protein",
    "group": "urinalysis",
    "specimen": "urine",
    "unit": "mg/L",
    "names": {
      "en": "Urine protein",
      "ru": "Белок в моче",
      "es": "Proteína en orina"
    },
    "aliases": [
      "Urine total protein",
      "Протеинурия"
    ]
  },
  {
    "id": "urine_ph",
    "group": "urinalysis",
    "specimen": "urine",
    "unit": "pH",
    "names": {
      "en": "Urine pH",
      "ru": "pH мочи",
      "es": "pH de orina"
    },
    "aliases": [
      "pH urine",
      "Кислотность мочи"
    ]
  },
  {
    "id": "urine_specific_gravity",
    "group": "urinalysis",
    "specimen": "urine",
    "unit": "ratio",
    "names": {
      "en": "Urine specific gravity",
      "ru": "Удельный вес мочи",
      "es": "Densidad urinaria"
    },
    "aliases": [
      "Urine SG",
      "Относительная плотность мочи"
    ]
  },
  {
    "id": "urine_nitrites",
    "group": "urinalysis",
    "specimen": "urine",
    "unit": "qualitative",
    "names": {
      "en": "Urine nitrites",
      "ru": "Нитриты мочи",
      "es": "Nitritos en orina"
    },
    "aliases": [
      "Nitrites urine",
      "Нитриты"
    ]
  },
  {
    "id": "urine_rbc",
    "group": "urinalysis",
    "specimen": "urine",
    "unit": "cells/HPF",
    "names": {
      "en": "Urine red blood cells",
      "ru": "Эритроциты мочи",
      "es": "Eritrocitos en orina"
    },
    "aliases": [
      "RBC urine",
      "Эритроциты в моче"
    ]
  }
])
export const LAB_REFERENCE_SOURCES = Object.freeze({
  "uiowa-hgb": {
    "institution": "University of Iowa Hospitals and Clinics",
    "test": "Hemoglobin",
    "specimen": "EDTA whole blood",
    "method": "colorimetric",
    "url": "https://www.healthcare.uiowa.edu/path_handbook/handbook/test960.html",
    "checkedOn": "2026-10-20",
    "scope": "laboratory-specific",
    "specimenKey": "blood",
    "sourceUnit": "g/dL"
  },
  "uiowa-wbc": {
    "institution": "University of Iowa Hospitals and Clinics",
    "test": "WBC Count",
    "specimen": "EDTA whole blood",
    "method": "flow cytometry",
    "url": "https://www.healthcare.uiowa.edu/path_handbook/handbook/test1977.html",
    "checkedOn": "2026-10-20",
    "scope": "laboratory-specific",
    "specimenKey": "blood",
    "sourceUnit": "k/mm3"
  },
  "uiowa-cbc": {
    "institution": "University of Iowa Hospitals and Clinics",
    "test": "CBC (Complete Blood Count)",
    "specimen": "EDTA whole blood",
    "method": "laboratory CBC",
    "url": "https://www.healthcare.uiowa.edu/path_handbook/rhandbook/test299.html",
    "checkedOn": "2026-10-20",
    "scope": "laboratory-specific",
    "specimenKey": "blood",
    "sourceUnit": "analyte-specific"
  },
  "uiowa-alp": {
    "institution": "University of Iowa Hospitals and Clinics",
    "test": "Alkaline Phosphatase",
    "specimen": "plasma",
    "method": "colorimetric",
    "url": "https://www.healthcare.uiowa.edu/path_handbook/rhandbook/test1487.html",
    "checkedOn": "2026-10-20",
    "scope": "laboratory-specific",
    "specimenKey": "plasma",
    "sourceUnit": "U/L"
  },
  "uiowa-tsh": {
    "institution": "University of Iowa Hospitals and Clinics",
    "test": "Thyroid Stimulating Hormone (TSH)",
    "specimen": "serum/plasma (plasma lab collection)",
    "specimenKey": "plasma",
    "sourceUnit": "µIU/mL",
    "method": "electrochemiluminescence immunoassay",
    "url": "https://www.healthcare.uiowa.edu/path_handbook/handbook/test1827.html",
    "checkedOn": "2026-10-20",
    "scope": "laboratory-specific"
  },
  "uiowa-creatinine": {
    "institution": "University of Iowa Hospitals and Clinics",
    "test": "Creatinine",
    "specimen": "plasma",
    "specimenKey": "plasma",
    "sourceUnit": "mg/dL",
    "method": "enzymatic colorimetric",
    "url": "https://www.healthcare.uiowa.edu/path_handbook/rhandbook/test530.html",
    "checkedOn": "2026-10-20",
    "scope": "laboratory-specific"
  },
  "uiowa-ferritin": {
    "institution": "University of Iowa Hospitals and Clinics",
    "test": "Ferritin",
    "specimen": "plasma",
    "specimenKey": "plasma",
    "sourceUnit": "ng/mL",
    "method": "electrochemiluminescence immunoassay",
    "url": "https://www.healthcare.uiowa.edu/path_handbook/rhandbook/test793.html",
    "checkedOn": "2026-10-20",
    "scope": "laboratory-specific"
  }
})
// Ages use half-open completed-calendar-months intervals; neonatal boundaries additionally use age in days.
// These intervals may only be surfaced as sourced examples. Even a source-lab name match is not sufficient to
// classify a patient's result without verified laboratory/method context and clinical approval.
export const LAB_EDUCATIONAL_INTERVALS = Object.freeze([
  {
    "analyteId": "hemoglobin",
    "sourceId": "uiowa-hgb",
    "sex": "any",
    "low": 13.4,
    "high": 19.9,
    "minMonths": 0,
    "maxMonthsExclusive": 1,
    "minDays": 0,
    "maxDaysExclusive": 31
  },
  {
    "analyteId": "hemoglobin",
    "sourceId": "uiowa-hgb",
    "sex": "any",
    "low": 10.7,
    "high": 17.1,
    "minMonths": 0,
    "maxMonthsExclusive": 2,
    "minDays": 31,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "hemoglobin",
    "sourceId": "uiowa-hgb",
    "sex": "any",
    "low": 9,
    "high": 14.1,
    "minMonths": 2,
    "maxMonthsExclusive": 3,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "hemoglobin",
    "sourceId": "uiowa-hgb",
    "sex": "any",
    "low": 9.5,
    "high": 14.1,
    "minMonths": 3,
    "maxMonthsExclusive": 6,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "hemoglobin",
    "sourceId": "uiowa-hgb",
    "sex": "any",
    "low": 11.3,
    "high": 14.1,
    "minMonths": 6,
    "maxMonthsExclusive": 12,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "hemoglobin",
    "sourceId": "uiowa-hgb",
    "sex": "any",
    "low": 10.9,
    "high": 15,
    "minMonths": 12,
    "maxMonthsExclusive": 60,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "hemoglobin",
    "sourceId": "uiowa-hgb",
    "sex": "any",
    "low": 11.9,
    "high": 15,
    "minMonths": 60,
    "maxMonthsExclusive": 132,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "hemoglobin",
    "sourceId": "uiowa-hgb",
    "sex": "male",
    "low": 12.7,
    "high": 17,
    "minMonths": 132,
    "maxMonthsExclusive": 216,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "hemoglobin",
    "sourceId": "uiowa-hgb",
    "sex": "female",
    "low": 11.9,
    "high": 15,
    "minMonths": 132,
    "maxMonthsExclusive": 216,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "hemoglobin",
    "sourceId": "uiowa-hgb",
    "sex": "male",
    "low": 13.2,
    "high": 17.7,
    "minMonths": 216,
    "maxMonthsExclusive": null,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "hemoglobin",
    "sourceId": "uiowa-hgb",
    "sex": "female",
    "low": 11.9,
    "high": 15.5,
    "minMonths": 216,
    "maxMonthsExclusive": null,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "wbc",
    "sourceId": "uiowa-wbc",
    "sex": "any",
    "low": 9,
    "high": 30,
    "minMonths": 0,
    "maxMonthsExclusive": 1,
    "minDays": 0,
    "maxDaysExclusive": 31
  },
  {
    "analyteId": "wbc",
    "sourceId": "uiowa-wbc",
    "sex": "any",
    "low": 5,
    "high": 19.5,
    "minMonths": 0,
    "maxMonthsExclusive": 3,
    "minDays": 31,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "wbc",
    "sourceId": "uiowa-wbc",
    "sex": "any",
    "low": 6,
    "high": 17.5,
    "minMonths": 3,
    "maxMonthsExclusive": 12,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "wbc",
    "sourceId": "uiowa-wbc",
    "sex": "any",
    "low": 6,
    "high": 17,
    "minMonths": 12,
    "maxMonthsExclusive": 24,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "wbc",
    "sourceId": "uiowa-wbc",
    "sex": "any",
    "low": 5.5,
    "high": 15.5,
    "minMonths": 24,
    "maxMonthsExclusive": 48,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "wbc",
    "sourceId": "uiowa-wbc",
    "sex": "any",
    "low": 5,
    "high": 15.5,
    "minMonths": 48,
    "maxMonthsExclusive": 72,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "wbc",
    "sourceId": "uiowa-wbc",
    "sex": "any",
    "low": 4.5,
    "high": 13,
    "minMonths": 72,
    "maxMonthsExclusive": 216,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "wbc",
    "sourceId": "uiowa-wbc",
    "sex": "any",
    "low": 3.7,
    "high": 10.5,
    "minMonths": 216,
    "maxMonthsExclusive": null,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "alp",
    "sourceId": "uiowa-alp",
    "sex": "any",
    "low": 83,
    "high": 248,
    "minMonths": 0,
    "maxMonthsExclusive": 1,
    "minDays": 0,
    "maxDaysExclusive": 15
  },
  {
    "analyteId": "alp",
    "sourceId": "uiowa-alp",
    "sex": "any",
    "low": 122,
    "high": 469,
    "minMonths": 0,
    "maxMonthsExclusive": 12,
    "minDays": 15,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "alp",
    "sourceId": "uiowa-alp",
    "sex": "any",
    "low": 142,
    "high": 335,
    "minMonths": 12,
    "maxMonthsExclusive": 120,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "alp",
    "sourceId": "uiowa-alp",
    "sex": "any",
    "low": 129,
    "high": 417,
    "minMonths": 120,
    "maxMonthsExclusive": 156,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "alp",
    "sourceId": "uiowa-alp",
    "sex": "male",
    "low": 116,
    "high": 468,
    "minMonths": 156,
    "maxMonthsExclusive": 180,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "alp",
    "sourceId": "uiowa-alp",
    "sex": "female",
    "low": 57,
    "high": 254,
    "minMonths": 156,
    "maxMonthsExclusive": 180,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "alp",
    "sourceId": "uiowa-alp",
    "sex": "male",
    "low": 82,
    "high": 331,
    "minMonths": 180,
    "maxMonthsExclusive": 204,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "alp",
    "sourceId": "uiowa-alp",
    "sex": "female",
    "low": 50,
    "high": 117,
    "minMonths": 180,
    "maxMonthsExclusive": 204,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "alp",
    "sourceId": "uiowa-alp",
    "sex": "male",
    "low": 55,
    "high": 149,
    "minMonths": 204,
    "maxMonthsExclusive": 228,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "alp",
    "sourceId": "uiowa-alp",
    "sex": "female",
    "low": 45,
    "high": 87,
    "minMonths": 204,
    "maxMonthsExclusive": 228,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "alp",
    "sourceId": "uiowa-alp",
    "sex": "male",
    "low": 40,
    "high": 129,
    "minMonths": 228,
    "maxMonthsExclusive": null,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "alp",
    "sourceId": "uiowa-alp",
    "sex": "female",
    "low": 35,
    "high": 104,
    "minMonths": 228,
    "maxMonthsExclusive": null,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "rbc",
    "sourceId": "uiowa-cbc",
    "sex": "any",
    "low": 3.9,
    "high": 5.9,
    "minMonths": 0,
    "maxMonthsExclusive": 1,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "rbc",
    "sourceId": "uiowa-cbc",
    "sex": "any",
    "low": 3.1,
    "high": 5.3,
    "minMonths": 1,
    "maxMonthsExclusive": 2,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "rbc",
    "sourceId": "uiowa-cbc",
    "sex": "any",
    "low": 2.7,
    "high": 4.5,
    "minMonths": 2,
    "maxMonthsExclusive": 3,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "rbc",
    "sourceId": "uiowa-cbc",
    "sex": "any",
    "low": 3.1,
    "high": 5.1,
    "minMonths": 3,
    "maxMonthsExclusive": 6,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "rbc",
    "sourceId": "uiowa-cbc",
    "sex": "any",
    "low": 3.9,
    "high": 5.5,
    "minMonths": 6,
    "maxMonthsExclusive": 12,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "rbc",
    "sourceId": "uiowa-cbc",
    "sex": "any",
    "low": 3.8,
    "high": 5.2,
    "minMonths": 12,
    "maxMonthsExclusive": 60,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "rbc",
    "sourceId": "uiowa-cbc",
    "sex": "male",
    "low": 4.3,
    "high": 5.5,
    "minMonths": 60,
    "maxMonthsExclusive": 132,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "rbc",
    "sourceId": "uiowa-cbc",
    "sex": "female",
    "low": 4.1,
    "high": 5.2,
    "minMonths": 60,
    "maxMonthsExclusive": 132,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "rbc",
    "sourceId": "uiowa-cbc",
    "sex": "male",
    "low": 4.3,
    "high": 5.6,
    "minMonths": 132,
    "maxMonthsExclusive": 216,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "rbc",
    "sourceId": "uiowa-cbc",
    "sex": "female",
    "low": 3.9,
    "high": 5.1,
    "minMonths": 132,
    "maxMonthsExclusive": 216,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "rbc",
    "sourceId": "uiowa-cbc",
    "sex": "male",
    "low": 4.5,
    "high": 6.2,
    "minMonths": 216,
    "maxMonthsExclusive": null,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "rbc",
    "sourceId": "uiowa-cbc",
    "sex": "female",
    "low": 4,
    "high": 5.2,
    "minMonths": 216,
    "maxMonthsExclusive": null,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "mcv",
    "sourceId": "uiowa-cbc",
    "sex": "any",
    "low": 88,
    "high": 123,
    "minMonths": 0,
    "maxMonthsExclusive": 1,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "mcv",
    "sourceId": "uiowa-cbc",
    "sex": "any",
    "low": 91,
    "high": 112,
    "minMonths": 1,
    "maxMonthsExclusive": 3,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "mcv",
    "sourceId": "uiowa-cbc",
    "sex": "any",
    "low": 74,
    "high": 108,
    "minMonths": 3,
    "maxMonthsExclusive": 6,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "mcv",
    "sourceId": "uiowa-cbc",
    "sex": "any",
    "low": 70,
    "high": 85,
    "minMonths": 6,
    "maxMonthsExclusive": 12,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "mcv",
    "sourceId": "uiowa-cbc",
    "sex": "any",
    "low": 75,
    "high": 90,
    "minMonths": 12,
    "maxMonthsExclusive": 72,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "mcv",
    "sourceId": "uiowa-cbc",
    "sex": "any",
    "low": 77,
    "high": 90,
    "minMonths": 72,
    "maxMonthsExclusive": 144,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "mcv",
    "sourceId": "uiowa-cbc",
    "sex": "any",
    "low": 79,
    "high": 95,
    "minMonths": 144,
    "maxMonthsExclusive": 216,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "mcv",
    "sourceId": "uiowa-cbc",
    "sex": "any",
    "low": 82,
    "high": 99,
    "minMonths": 216,
    "maxMonthsExclusive": null,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "hematocrit",
    "sourceId": "uiowa-cbc",
    "sex": "male",
    "low": 40,
    "high": 52,
    "minMonths": 216,
    "maxMonthsExclusive": null,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "hematocrit",
    "sourceId": "uiowa-cbc",
    "sex": "female",
    "low": 35,
    "high": 47,
    "minMonths": 216,
    "maxMonthsExclusive": null,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "platelets",
    "sourceId": "uiowa-cbc",
    "sex": "any",
    "low": 150,
    "high": 400,
    "minMonths": 216,
    "maxMonthsExclusive": null,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "tsh",
    "sourceId": "uiowa-tsh",
    "sex": "any",
    "low": 1.03,
    "high": 6.8,
    "minMonths": 1,
    "maxMonthsExclusive": 12,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "tsh",
    "sourceId": "uiowa-tsh",
    "sex": "any",
    "low": 1.12,
    "high": 5.01,
    "minMonths": 12,
    "maxMonthsExclusive": 180,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "tsh",
    "sourceId": "uiowa-tsh",
    "sex": "any",
    "low": 0.68,
    "high": 4.09,
    "minMonths": 180,
    "maxMonthsExclusive": 228,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "tsh",
    "sourceId": "uiowa-tsh",
    "sex": "any",
    "low": 0.27,
    "high": 4.2,
    "minMonths": 228,
    "maxMonthsExclusive": null,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "creatinine",
    "sourceId": "uiowa-creatinine",
    "sex": "any",
    "low": 0.4,
    "high": 1,
    "minMonths": 0,
    "maxMonthsExclusive": 1,
    "minDays": 0,
    "maxDaysExclusive": 15
  },
  {
    "analyteId": "creatinine",
    "sourceId": "uiowa-creatinine",
    "sex": "any",
    "low": 0.2,
    "high": 0.4,
    "minMonths": 0,
    "maxMonthsExclusive": 24,
    "minDays": 15,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "creatinine",
    "sourceId": "uiowa-creatinine",
    "sex": "any",
    "low": 0.3,
    "high": 0.5,
    "minMonths": 24,
    "maxMonthsExclusive": 48,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "creatinine",
    "sourceId": "uiowa-creatinine",
    "sex": "any",
    "low": 0.4,
    "high": 0.7,
    "minMonths": 48,
    "maxMonthsExclusive": 144,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "creatinine",
    "sourceId": "uiowa-creatinine",
    "sex": "any",
    "low": 0.5,
    "high": 0.9,
    "minMonths": 144,
    "maxMonthsExclusive": 192,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "creatinine",
    "sourceId": "uiowa-creatinine",
    "sex": "male",
    "low": 0.67,
    "high": 1.17,
    "minMonths": 192,
    "maxMonthsExclusive": null,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "creatinine",
    "sourceId": "uiowa-creatinine",
    "sex": "female",
    "low": 0.51,
    "high": 0.95,
    "minMonths": 192,
    "maxMonthsExclusive": null,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "ferritin",
    "sourceId": "uiowa-ferritin",
    "sex": "male",
    "low": 30,
    "high": 400,
    "minMonths": 228,
    "maxMonthsExclusive": null,
    "minDays": null,
    "maxDaysExclusive": null
  },
  {
    "analyteId": "ferritin",
    "sourceId": "uiowa-ferritin",
    "sex": "female",
    "low": 13,
    "high": 150,
    "minMonths": 228,
    "maxMonthsExclusive": null,
    "minDays": null,
    "maxDaysExclusive": null
  }
])
