import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { buildToolList, BASE_TOOLS, OPTIONAL_TOOLS } from '../tools/index.js'

const ALL_CAPABILITY_KEYS = ['menu','ordering','delivery','booking','contact','products','services','information']

describe('buildToolList — Property Tests', () => {
  it('Property 2a: every base tool is always present regardless of capabilities', () => {
    fc.assert(
      fc.property(
        fc.subarray(ALL_CAPABILITY_KEYS),
        (enabledCapabilities) => {
          const tools = buildToolList(enabledCapabilities)
          for (const baseTool of BASE_TOOLS) {
            expect(tools).toContain(baseTool)
          }
        },
      ),
      { numRuns: 500 },
    )
  })

  it('Property 2b: an optional tool is present IFF its required capability is enabled', () => {
    fc.assert(
      fc.property(
        fc.subarray(ALL_CAPABILITY_KEYS),
        (enabledCapabilities) => {
          const tools = buildToolList(enabledCapabilities)
          for (const optional of OPTIONAL_TOOLS) {
            const shouldBePresent = enabledCapabilities.includes(optional.requiredCapability)
            expect(tools.includes(optional.name)).toBe(shouldBePresent)
          }
        },
      ),
      { numRuns: 500 },
    )
  })

  it('Property 2c: no duplicate tool names', () => {
    fc.assert(
      fc.property(
        fc.subarray(ALL_CAPABILITY_KEYS),
        (enabledCapabilities) => {
          const tools = buildToolList(enabledCapabilities)
          expect(new Set(tools).size).toBe(tools.length)
        },
      ),
    )
  })

  it('empty capabilities returns exactly the base tools', () => {
    const tools = buildToolList([])
    expect(tools.sort()).toEqual([...BASE_TOOLS].sort())
  })

  it('all capabilities enabled returns base + all optional tools', () => {
    const tools = buildToolList(ALL_CAPABILITY_KEYS)
    const expected = [...BASE_TOOLS, ...OPTIONAL_TOOLS.map((t) => t.name)]
    expect(tools.sort()).toEqual(expected.sort())
  })
})