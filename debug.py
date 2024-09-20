import requests
from bs4 import BeautifulSoup

# URL da seção de destaques do Zona Sul
url = 'https://www.zonasul.com.br/ofertas'

def get_featured_items():
    try:
        # Fazer a requisição ao site
        response = requests.get(url)
        response.raise_for_status()  # Verifica erros

        # Usar BeautifulSoup para parsear o HTML
        soup = BeautifulSoup(response.text, 'html.parser')

        # Selecionar os itens de destaque utilizando o seletor fornecido
        featured_items = []
        for item in soup.select('span.vtex-product-summary-2-x-productBrand'):
            name = item.text.strip()
            featured_items.append(name)

        if not featured_items:
            print("Nenhum item destacado encontrado. Verifique se o seletor está correto.")
        return featured_items
    except Exception as e:
        print(f"Erro ao realizar scraping: {e}")
        return []

# Exemplo de uso
featured_items = get_featured_items()
print("Itens em Destaque no Zona Sul:", featured_items)
