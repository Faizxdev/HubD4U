import axios from 'axios';

export async function gofileExtracter(
  id: string,
): Promise<{link: string; token: string}> {
  // Guard against undefined/null/empty id
  if (!id || typeof id !== 'string') {
    console.warn(`[GOFILE] Invalid id provided: ${id}`);
    return {link: '', token: ''};
  }
  
  try {
    const genAccountres = await axios.post('https://api.gofile.io/accounts');
    const token = genAccountres.data.data.token;
    const wtRes = await axios.get('https://gofile.io/dist/js/global.js');
    const wt = wtRes.data.match(/appdata\.wt\s*=\s*["']([^"']+)["']/)[1];
    const res = await axios.get(`https://api.gofile.io/contents/${id}?wt=${wt}`, {
      headers: {Authorization: `Bearer ${token}`},
    });
    const oId = Object.keys(res.data.data.children)[0];
    const link = res.data.data.children[oId].link;
    return {link, token};
  } catch (e) {
    return {link: '', token: ''};
  }
}


