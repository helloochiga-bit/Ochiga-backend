// src/services/codeService.ts
export async function generateAccessCode(length = Number(process.env.VISITOR_CODE_LENGTH || 8)) {
  // numeric code
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
}
