#!/usr/bin/env python3
"""
organizar.py — Reorganiza o repositório "jogos" (Fábrica de Palavras).

Move os arquivos soltos na raiz para as pastas que os .html esperam:

    *.css                          -> assets/css/
    *.js                           -> assets/js/
    *.webp .png .jpg .jpeg .gif
    .svg .ico                      -> assets/images/

Os arquivos .html (e qualquer outro tipo) continuam na raiz.

COMO USAR
  1. Copie este arquivo para dentro da pasta do repositório (onde está o index.html).
  2. Abra o terminal nessa pasta e rode primeiro uma simulação:
         python organizar.py --simular
  3. Se a lista estiver correta, rode de verdade:
         python organizar.py

  No Windows, se "python" não funcionar, tente "py organizar.py".

Se a pasta for um repositório Git, usa "git mv" (o histórico é preservado).
Caso contrário, move os arquivos normalmente. Pode rodar de novo sem problema:
arquivos que já estão no lugar certo são ignorados.
"""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

DESTINOS = {
    ".css": "assets/css",
    ".js": "assets/js",
    ".webp": "assets/images",
    ".png": "assets/images",
    ".jpg": "assets/images",
    ".jpeg": "assets/images",
    ".gif": "assets/images",
    ".svg": "assets/images",
    ".ico": "assets/images",
}


def eh_repo_git(pasta: Path) -> bool:
    try:
        r = subprocess.run(
            ["git", "rev-parse", "--is-inside-work-tree"],
            cwd=pasta, capture_output=True, text=True,
        )
        return r.returncode == 0 and r.stdout.strip() == "true"
    except FileNotFoundError:
        return False


def mover(origem: Path, destino: Path, usar_git: bool, raiz: Path) -> None:
    destino.parent.mkdir(parents=True, exist_ok=True)
    if usar_git:
        r = subprocess.run(
            ["git", "mv", str(origem.relative_to(raiz)), str(destino.relative_to(raiz))],
            cwd=raiz, capture_output=True, text=True,
        )
        if r.returncode == 0:
            return
        # arquivo não rastreado pelo git: cai para o movimento normal
    shutil.move(str(origem), str(destino))


def main() -> int:
    ap = argparse.ArgumentParser(description="Reorganiza os arquivos do site em assets/.")
    ap.add_argument("--simular", action="store_true",
                    help="só mostra o que seria feito, sem mover nada")
    ap.add_argument("--pasta", default=".",
                    help="pasta do repositório (padrão: pasta atual)")
    args = ap.parse_args()

    raiz = Path(args.pasta).resolve()
    if not (raiz / "index.html").exists():
        print(f"Não encontrei index.html em {raiz}.")
        print("Rode o script dentro da pasta do repositório (ou use --pasta CAMINHO).")
        return 1

    este_script = Path(__file__).resolve()
    usar_git = eh_repo_git(raiz)

    plano = []
    for item in sorted(raiz.iterdir()):
        if not item.is_file() or item.resolve() == este_script:
            continue
        pasta_destino = DESTINOS.get(item.suffix.lower())
        if pasta_destino:
            plano.append((item, raiz / pasta_destino / item.name))

    if not plano:
        print("Nada para mover: os arquivos já parecem estar organizados.")
        return 0

    conflitos = [d for _, d in plano if d.exists()]
    if conflitos:
        print("ATENÇÃO: estes destinos já existem e não serão sobrescritos:")
        for d in conflitos:
            print("  -", d.relative_to(raiz))
        plano = [(o, d) for o, d in plano if not d.exists()]

    contagem = {}
    for _, d in plano:
        chave = d.parent.relative_to(raiz).as_posix()
        contagem[chave] = contagem.get(chave, 0) + 1

    modo = "SIMULAÇÃO" if args.simular else "MOVENDO"
    print(f"{modo} ({'com git mv' if usar_git else 'sem git'}) — {len(plano)} arquivo(s):")
    for pasta, qtd in sorted(contagem.items()):
        print(f"  {pasta}/  <-  {qtd} arquivo(s)")

    if args.simular:
        print("\nExemplos:")
        for o, d in plano[:8]:
            print(f"  {o.name}  ->  {d.relative_to(raiz).as_posix()}")
        print("\nNada foi alterado. Rode sem --simular para aplicar.")
        return 0

    for origem, destino in plano:
        mover(origem, destino, usar_git, raiz)

    print("\nPronto! Estrutura final:")
    print("  index.html, silabas.html, ... (raiz)")
    for pasta in sorted(contagem):
        print(f"  {pasta}/")
    print("\nPróximos passos (se usa Git):")
    print("  git add -A")
    print('  git commit -m "Reorganiza arquivos em assets/"')
    print("  git push")
    print("Depois aguarde 1–2 minutos e abra o site com Ctrl+F5.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
