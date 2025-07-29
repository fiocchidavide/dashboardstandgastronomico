import os
import psycopg2
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from psycopg2 import sql

# Carica le variabili d'ambiente dal file .env
load_dotenv()

# Configura l'app Flask per servire i file statici dalla build del frontend
app = Flask(__name__, static_folder='../frontend/dist', static_url_path='/')

# Abilita CORS, utile soprattutto in fase di sviluppo
CORS(app)

def get_db_connection():
    """Crea e restituisce una connessione al database."""
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST'),
            port=os.getenv('DB_PORT'),
            dbname=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD')
        )
        return conn
    except psycopg2.OperationalError as e:
        print(f"Errore di connessione al database: {e}")
        return None
    
@app.route('/api/debug', methods=['GET'])
def print_debug():
    """Endpoint API per testare la connessione al database."""
    try:
        with get_db_connection() as conn:
            if conn is None:
                return jsonify({"error": "Impossibile connettersi al database"}), 500
            with conn.cursor() as cur:
                # Esegui una semplice query per testare la connessione
                cur.execute('SELECT 1')
                return jsonify({"message": "Connessione al database riuscita!"})
    except Exception as e:
        return jsonify({"error": f"Errore durante il test di connessione: {e}"}), 500

@app.route('/api/articles', methods=['GET'])
def get_articles():
    """Endpoint API per recuperare gli articoli dal database."""
    try:
        with get_db_connection() as conn:
            if conn is None:
                return jsonify({"error": "Impossibile connettersi al database"}), 500
            with conn.cursor() as cur:
                cur.execute("SELECT id, descrizione FROM articoli ORDER BY id;")
                articles_data = cur.fetchall()
                articles = [{"id": row[0], "descrizione": row[1]} for row in articles_data]
                return jsonify(articles)
    except Exception as e:
        return jsonify({"error": f"Errore durante il recupero degli articoli: {e}"}), 500

def fetch_orders_by_description(descrizioni, data, ora=None):
    """Recupera gli ordini dal database in base a una lista di descrizioni, a una data e a un'ora opzionale."""
    if not isinstance(descrizioni, list) or not descrizioni:
        raise ValueError("La lista di descrizioni non può essere vuota.")
    if not data:
        raise ValueError("La data è richiesta.")

    try:
        with get_db_connection() as conn:
            if conn is None:
                raise ConnectionError("Impossibile connettersi al database")
            
            with conn.cursor() as cur:
                # Costruzione dinamica e sicura della query con psycopg2.sql
                select_parts = [
                    sql.SQL("o.id AS id_ordine"),
                    sql.SQL("o.cliente"),
                    sql.SQL("o.ora")
                ]
                params = []
                
                for i, desc in enumerate(descrizioni):
                    alias = sql.Identifier(f'q{i}')
                    select_parts.append(
                        sql.SQL("SUM(CASE WHEN r.descrizione = %s THEN r.quantita ELSE 0 END) AS {}").format(alias)
                    )
                    params.append(desc)

                select_clause = sql.SQL(', ').join(select_parts)
                
                # La clausola WHERE usa segnaposto per i valori
                where_clause_parts = [
                    sql.SQL("r.descrizione IN %s"),
                    sql.SQL("o.data = %s")
                ]
                params.append(tuple(descrizioni))
                params.append(data)

                # Aggiungi la condizione per l'ora se fornita
                if ora:
                    where_clause_parts.append(sql.SQL("o.ora > %s"))
                    params.append(ora)

                where_clause = sql.SQL(' AND ').join(where_clause_parts)

                query = sql.SQL("""
                    SELECT {select_clause}
                    FROM public.ordini o
                    JOIN public.righe r ON o.id = r.id_ordine
                    WHERE {where_clause}
                    GROUP BY o.id, o.cliente, o.ora
                    HAVING SUM(r.quantita) > 0
                    ORDER BY o.ora;
                """).format(
                    select_clause=select_clause,
                    where_clause=where_clause
                )

                cur.execute(query, tuple(params))
                
                # Costruisci la risposta JSON con nomi di colonna dinamici
                colnames = [desc[0] for desc in cur.description]
                rows = cur.fetchall()
                orders = []
                for row in rows:
                    raw_row_dict = dict(zip(colnames, row))
                    
                    order_dict = {
                        "id_ordine": raw_row_dict["id_ordine"],
                        "cliente": raw_row_dict["cliente"],
                        "ora": raw_row_dict["ora"].strftime('%H:%M:%S') if raw_row_dict["ora"] else None,
                        "quantità": {}
                    }

                    for i, desc in enumerate(descrizioni):
                        alias = f'q{i}'
                        quantita = raw_row_dict.get(alias, 0)
                        if quantita > 0:
                            order_dict["quantità"][desc] = quantita
                    
                    orders.append(order_dict)
                
                return orders
    except psycopg2.Error as db_err:
        # Rilancia l'errore del database per una gestione più specifica
        raise ConnectionError(f"Errore del database: {db_err}") from db_err
    except Exception as e:
        # Rilancia altri errori inaspettati
        raise RuntimeError(f"Un errore inaspettato è occorso: {e}") from e

@app.route('/api/orders', methods=['POST'])
def get_orders():
    """Endpoint API per recuperare gli ordini in base a una lista di descrizioni di articoli."""
    data = request.get_json()
    if not data or 'descrizioni' not in data or 'data' not in data:
        return jsonify({"error": "La lista di descrizioni e la data sono richieste."}), 400

    try:
        descrizioni = data['descrizioni']
        data_ordine = data['data']
        ora_ordine = data.get('ora')  # 'ora' è opzionale
        orders = fetch_orders_by_description(descrizioni, data_ordine, ora_ordine)
        return jsonify(orders)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except ConnectionError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": f"Errore durante il recupero degli ordini: {e}"}), 500

@app.route('/')
def serve_index():
    """Serve il file index.html dalla cartella statica."""
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    # Avvia l'applicazione Flask in modalità di debug sulla porta 5001
    app.run(debug=True, port=5001)