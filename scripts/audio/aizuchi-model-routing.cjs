// Route complete responses, including future variants, rather than splicing
// different models into one utterance. A's scene voice is deliberately separate.
function useAlternateModel(entry,reply=''){
 return /(?:へ[えぇー]+|え[えぇー]+|あ[あぁー]+)/u.test([entry.expression,entry.reading,reply].filter(Boolean).join('\n'));
}
module.exports={useAlternateModel};
