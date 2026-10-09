import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// Simulates the SQL-layer filter: status = 'published' AND is_active = true
// This models the exact predicate used by all MCP discovery queries.

interface FakeBusiness {
  status: 'draft' | 'published'
  isActive: boolean
}

function isDiscoverable(b: FakeBusiness): boolean {
  return b.status === 'published' && b.isActive === true
}

function discover(businesses: FakeBusiness[]): FakeBusiness[] {
  return businesses.filter(isDiscoverable)
}

const businessArb = fc.record({
  status: fc.constantFrom('draft' as const, 'published' as const),
  isActive: fc.boolean(),
})

describe('Discovery Isolation — Property Tests', () => {
  it('Property 1: every discoverable business has status=published AND isActive=true', () => {
    fc.assert(
      fc.property(
        fc.array(businessArb, { minLength: 0, maxLength: 50 }),
        (businesses) => {
          const results = discover(businesses)
          expect(
            results.every((b) => b.status === 'published' && b.isActive === true),
          ).toBe(true)
        },
      ),
      { numRuns: 1000 },
    )
  })

  it('no draft business ever appears in results', () => {
    fc.assert(
      fc.property(
        fc.array(businessArb, { minLength: 0, maxLength: 50 }),
        (businesses) => {
          const results = discover(businesses)
          expect(results.filter((b) => b.status === 'draft').length).toBe(0)
        },
      ),
    )
  })

  it('no inactive business ever appears in results', () => {
    fc.assert(
      fc.property(
        fc.array(businessArb, { minLength: 0, maxLength: 50 }),
        (businesses) => {
          const results = discover(businesses)
          expect(results.filter((b) => !b.isActive).length).toBe(0)
        },
      ),
    )
  })

  it('a published+active business always appears in results', () => {
    fc.assert(
      fc.property(
        fc.array(businessArb, { minLength: 0, maxLength: 30 }),
        (extra) => {
          const publishedActive: FakeBusiness = { status: 'published', isActive: true }
          const all = [...extra, publishedActive]
          const results = discover(all)
          expect(results.includes(publishedActive)).toBe(true)
        },
      ),
    )
  })
})