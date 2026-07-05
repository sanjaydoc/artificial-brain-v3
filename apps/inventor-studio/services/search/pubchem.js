// PubChem compound search. Ported from ASI-1 src/search/pubchem.ts.

export async function searchPubChem(query, maxResults = 5) {
  try {
    const searchRes = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/cids/JSON?name_type=word`,
    )
    if (!searchRes.ok) return []
    const searchData = await searchRes.json()
    const cids = (searchData.IdentifierList?.CID || []).slice(0, maxResults)
    if (cids.length === 0) return []

    const results = []
    for (const cid of cids) {
      try {
        const propRes = await fetch(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/IUPACName,MolecularFormula,MolecularWeight/JSON`,
        )
        if (!propRes.ok) continue
        const propData = await propRes.json()
        const prop = propData.PropertyTable?.Properties?.[0] || {}
        results.push({
          cid,
          name: prop.IUPACName || '',
          formula: prop.MolecularFormula || '',
          molecularWeight: prop.MolecularWeight || 0,
          url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
          synonyms: [],
        })
      } catch {
        continue
      }
    }
    return results
  } catch (err) {
    console.error('[pubchem] search failed:', err.message)
    return []
  }
}
