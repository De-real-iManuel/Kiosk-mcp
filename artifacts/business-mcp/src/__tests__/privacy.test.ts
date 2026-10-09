import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// Tests that MCP tool response shaping never leaks ownerClerkId or private data.
// This is a pure unit test against the data-shaping logic, not live DB.

interface PrivateBusiness {
  id: string
  ownerClerkId: string  // private — must never appear in MCP responses
  slug: string
  businessName: string
  description: string | null
  city: string | null
  phone: string | null
}

// Simulates what a base tool response serialization should look like
function shapePublicProfile(business: PrivateBusiness): Record<string, unknown> {
  return {
    name: business.businessName,
    description: business.description,
    city: business.city,
    phone: business.phone,
    // ownerClerkId intentionally excluded
  }
}

function containsClerkId(json: string, clerkId: string): boolean {
  return json.includes(clerkId)
}

describe('No Private Data in MCP Responses — Property Tests', () => {
  it('Property 6: ownerClerkId never appears in the shaped public profile', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          ownerClerkId: fc.string({ minLength: 5, maxLength: 40 }),
          slug: fc.string({ minLength: 3 }),
          businessName: fc.string({ minLength: 1 }),
          description: fc.option(fc.string(), { nil: null }),
          city: fc.option(fc.string(), { nil: null }),
          phone: fc.option(fc.string(), { nil: null }),
        }),
        (business) => {
          const profile = shapePublicProfile(business)
          const json = JSON.stringify(profile)
          // ownerClerkId must never appear in any MCP tool response
          expect(containsClerkId(json, business.ownerClerkId)).toBe(false)
        },
      ),
      { numRuns: 1000 },
    )
  })

  it('shaped profile includes expected public fields', () => {
    const business: PrivateBusiness = {
      id: 'test-id',
      ownerClerkId: 'user_secret_clerk_id',
      slug: 'test-business',
      businessName: 'Test Business',
      description: 'A test',
      city: 'Lagos',
      phone: '+234000',
    }
    const profile = shapePublicProfile(business)
    expect(Object.keys(profile)).not.toContain('ownerClerkId')
    expect(Object.keys(profile)).not.toContain('id')
    expect(profile.name).toBe('Test Business')
    expect(profile.city).toBe('Lagos')
  })
})