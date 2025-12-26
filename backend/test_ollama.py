from langchain_ollama import OllamaLLM

print("Tentative de connexion à Ollama")

try:
    # On initialise le modèle
    llm = OllamaLLM(model="qwen2.5:latest")
    
    # On lui pose une question simple
    response = llm.invoke("Explique-moi ce qu'est un Smart Contract en 1 phrase.")
    
    print("\n✅ Succès ! Réponse de Qwen :")
    print(response)

except Exception as e:
    print(f"\n Erreur : {e}")
    print("Vérifie que Ollama tourne bien et que tu as téléchargé le modèle (ollama pull qwen2.5:7b)")