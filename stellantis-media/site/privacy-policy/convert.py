import zipfile,re,html,json,sys,os
U={}
for l in open(os.path.join(os.path.dirname(__file__),'icons.txt')):
    n,u=l.split(); U['media/image%s.png'%n]=u
FILES={'en':'ac2c5fdf-1646_-_PrivacyPolicy_CorpWeb_nocons_EN.docx','fr':'d7b9f18f-1640_-_PrivacyPolicy_CorpWeb_nocons_FR_fr.docx','it':'942e6e8d-1638_-_PrivacyPolicy_CorpWeb_nocons_IT_it.docx'}
D=sys.argv[1] if len(sys.argv)>1 else './'
def children(xml, tags):
    pat=re.compile(r'<(/?)w:(%s)\b[^>]*?(/?)>'%'|'.join(tags)); st=[]; out=[]; s=0
    for m in pat.finditer(xml):
        if m.group(3): continue
        if not m.group(1):
            if not st: s=m.start()
            st.append(m.group(2))
        else:
            st.pop()
            if not st: out.append((m.group(2),xml[s:m.end()]))
    return out
LINK=re.compile(r'(https?://[^\s<]+[^\s<.,;:)])|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,})')
def autolink(t):
    def r(m):
        if m.group(1): u=m.group(1); return '<a href="%s" target="_blank" rel="noopener">%s</a>'%(u,u)
        e=m.group(2); return '<a href="mailto:%s">%s</a>'%(e,e)
    return LINK.sub(r,t)
def runs(p,rels):
    out=[];allb=True;anyt=False
    for kind,r in children(p,['r','hyperlink']):
        rs=[r] if kind=='r' else [x for k,x in children(r[r.find('>')+1:],['r'])]
        for rr in rs:
            t=''.join(html.unescape(x) for x in re.findall(r'<w:t[^>]*>([^<]*)</w:t>',rr))
            if '<w:tab/>' in rr: t=' '+t
            if not t: continue
            b=bool(re.search(r'<w:b(?: w:val="(?:1|true)")?/>',rr))
            anyt=anyt or t.strip()!=''
            if t.strip() and not b: allb=False
            out.append((t,b))
    return out, (allb and anyt)
def render(rs):
    s='';buf='';cur=None
    # merge consecutive runs with same boldness
    m=[]
    for t,b in rs:
        if m and m[-1][1]==b: m[-1]=(m[-1][0]+t,b)
        else: m.append((t,b))
    for t,b in m:
        e=autolink(html.escape(t,quote=False))
        s+=('<strong>%s</strong>'%e if b and t.strip() else e)
    return re.sub(r'\s+',' ',s).strip()
def imgs(x,rels): return [U[rels[r]] for r in re.findall(r'r:embed="([^"]+)"',x) if rels.get(r) in U]
def paras(cellxml,rels):
    out=[]
    for k,p in children(cellxml,['p']):
        rs,allb=runs(p,rels); txt=render(rs)
        out.append({'t':txt,'b':allb,'li':'<w:numPr>' in p,'img':imgs(p,rels)})
    return out
def blocks(ps, firstsub=False):
    h='';inul=False
    for i,p in enumerate(ps):
        if not p['t']: continue
        if p['li']:
            if not inul: h+='<ul>'; inul=True
            h+='<li>%s</li>'%p['t']; continue
        if inul: h+='</ul>'; inul=False
        plain=re.sub(r'<[^>]+>','',p['t'])
        if p['b'] and len(plain)<120: h+='<h4>%s</h4>'%re.sub(r'</?strong>','',p['t'])
        else: h+='<p>%s</p>'%p['t']
    if inul: h+='</ul>'
    return h
def icons(lst,cls='stl-pp-ic'):
    return '<div class="%s">%s</div>'%(cls,''.join('<img src="%s" alt="" loading="lazy" width="48" height="48">'%u for u in lst)) if lst else '<div class="%s"></div>'%cls
for lang,f in FILES.items():
    z=zipfile.ZipFile(D+f); x=z.read('word/document.xml').decode()
    rels=dict(re.findall(r'Id="([^"]+)"[^>]*Target="([^"]+)"',z.read('word/_rels/document.xml.rels').decode()))
    body=x[x.find('<w:body>')+8:x.rfind('</w:body>')]
    out='<div class="stl-pp" data-pp-lang="%s" lang="%s">'%(lang,lang); intro=[];sec_open=False;title=None
    for tag,c in children(body,['p','tbl']):
        if tag=='p':
            ps=paras('<x>'+c+'</x>',rels)
            for p in ps:
                if not p['t']: continue
                if title is None: title=re.sub(r'<[^>]+>','',p['t']); out+='<h2 class="stl-pp-title">%s</h2>'%html.escape(title,quote=False); continue
                intro.append(p)
            continue
        if intro: out+='<div class="stl-pp-intro">'+blocks(intro)+'</div>'; intro=[]
        for row in re.findall(r'<w:tr\b.*?</w:tr>',c,re.S):
            cells=re.findall(r'<w:tc>.*?</w:tc>',row,re.S)
            if len(cells)<3: print('WARN cells',lang,len(cells)); continue
            c1,c2,c3=cells[0],cells[1],cells[2]
            p2=paras(c2,rels); t2=' '.join(re.sub(r'<[^>]+>','',p['t']) for p in p2 if p['t']).strip()
            ic=imgs(c1,rels)+imgs(c2,rels)
            content=blocks(paras(c3,rels))
            if t2:
                if sec_open: out+='</div></section>'
                m=re.match(r'^(\d+)\s*\.\s*(.*)$',t2)
                num,tt=(m.group(1),m.group(2)) if m else ('',t2)
                out+='<section class="stl-pp-sec">'+icons(ic)+'<div class="stl-pp-c"><h3>'+(('<span class="stl-pp-n">%s.</span> '%num) if num else '')+html.escape(tt,quote=False)+'</h3>'+content
                sec_open=True
            else:
                out+='<div class="stl-pp-sub">'+icons(ic,'stl-pp-ic sm')+'<div>'+content+'</div></div>'
    if sec_open: out+='</div></section>'
    out+='</div>'
    open(os.path.join(os.path.dirname(__file__),'%s.html'%lang),'w').write(out)
    print(lang,len(out),title)
