export type PractitionerCredentialPublic = {
  id: string
  title: string
  issuer: string
  jurisdiction: string
  reference: string
  public: boolean
  verificationStatus: 'declared' | 'verified' | 'rejected' | 'expired'
  expiresOn: string | null
  verifiedAt?: string | null
}

export type PractitionerPublicProfile = {
  displayName?: string
  name?: string
  professionalTitle?: string
  shortBio?: string
  fullBio?: string
  languages?: string[]
  city?: string
  region?: string
  country?: string
  formats?: string[]
  areas?: string[]
  methods?: string[]
  yearsExperience?: number | null
  websiteUrl?: string
  socialUrls?: string[]
  photoPath?: string
}

export type PublicService = {
  id: string
  practitionerId: string
  practitionerSlug: string
  practitionerName: string
  professionalTitle: string
  slug: string
  status: string
  active: boolean
  offeringType: string
  areaKey: string
  deliveryFormat: string
  locationLabel: string
  languages: string[]
  pricingMode: string
  confirmedPrice: number | null
  currency: string
  durationMinutes: number | null
  imagePath: string
  copy: {
    title: string
    shortDescription: string
    description: string
  }
}

export type PublicPractitioner = {
  id: string
  slug: string
  isPartner: boolean
  profile: PractitionerPublicProfile
  credentials: PractitionerCredentialPublic[]
  services: PublicService[]
}

export type PublicServiceDetail = {
  service: PublicService
  practitioner: PublicPractitioner
}
