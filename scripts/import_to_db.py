import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

file_path = r"./datasets/Rdir_2011_27_MAHARASHTRA.xls"

df = pd.read_excel(file_path)

# Remove hierarchy rows
df = df[df["MDDS PLCN"] != 0]

print(f"Villages to import: {len(df)}")

with engine.begin() as conn:

    # Create country if missing
    conn.execute(text("""
        INSERT INTO "Country" (code, name, "createdAt")
        VALUES ('IN', 'India', NOW())
        ON CONFLICT (code) DO NOTHING
    """))

    country_id = conn.execute(text("""
        SELECT id FROM "Country"
        WHERE code='IN'
    """)).fetchone()[0]

    states = {}
    districts = {}
    subdistricts = {}

    for index, row in df.iterrows():

        state_code = str(row["MDDS STC"])
        state_name = str(row["STATE NAME"]).strip()

        district_code = str(row["MDDS DTC"])
        district_name = str(row["DISTRICT NAME"]).strip()

        sub_code = str(row["MDDS Sub_DT"])
        sub_name = str(row["SUB-DISTRICT NAME"]).strip()

        village_code = str(row["MDDS PLCN"])
        village_name = str(row["Area Name"]).strip()

        # STATE
        if state_code not in states:

            conn.execute(text("""
                INSERT INTO "State"
                (code,name,"countryId","createdAt")
                VALUES (:code,:name,:country,NOW())
                ON CONFLICT (code) DO NOTHING
            """), {
                "code": state_code,
                "name": state_name,
                "country": country_id
            })

            state_id = conn.execute(text("""
                SELECT id FROM "State"
                WHERE code=:code
            """), {"code": state_code}).fetchone()[0]

            states[state_code] = state_id

        state_id = states[state_code]

        # DISTRICT
        district_key = f"{district_code}_{state_id}"

        if district_key not in districts:

            conn.execute(text("""
                INSERT INTO "District"
                (code,name,"stateId","createdAt")
                VALUES (:code,:name,:state,NOW())
                ON CONFLICT DO NOTHING
            """), {
                "code": district_code,
                "name": district_name,
                "state": state_id
            })

            district_id = conn.execute(text("""
                SELECT id FROM "District"
                WHERE code=:code
                AND "stateId"=:state
            """), {
                "code": district_code,
                "state": state_id
            }).fetchone()[0]

            districts[district_key] = district_id

        district_id = districts[district_key]

        # SUBDISTRICT
        sub_key = f"{sub_code}_{district_id}"

        if sub_key not in subdistricts:

            conn.execute(text("""
                INSERT INTO "SubDistrict"
                (code,name,"districtId","createdAt")
                VALUES (:code,:name,:district,NOW())
                ON CONFLICT DO NOTHING
            """), {
                "code": sub_code,
                "name": sub_name,
                "district": district_id
            })

            subdistrict_id = conn.execute(text("""
                SELECT id FROM "SubDistrict"
                WHERE code=:code
                AND "districtId"=:district
            """), {
                "code": sub_code,
                "district": district_id
            }).fetchone()[0]

            subdistricts[sub_key] = subdistrict_id

        subdistrict_id = subdistricts[sub_key]

        # VILLAGE
        conn.execute(text("""
            INSERT INTO "Village"
            (code,name,"subDistrictId","createdAt")
            VALUES (:code,:name,:sub,NOW())
            ON CONFLICT (code) DO NOTHING
        """), {
            "code": village_code,
            "name": village_name,
            "sub": subdistrict_id
        })

        if index % 1000 == 0:
            print(f"Imported {index} rows")

print("Import Complete")