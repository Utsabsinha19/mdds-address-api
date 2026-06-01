import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

datasets_path = Path("dataset")

with engine.begin() as conn:

    conn.execute(text("""
        INSERT INTO "Country" (code, name, "createdAt")
        VALUES ('IN', 'India', NOW())
        ON CONFLICT (code) DO NOTHING
    """))

    country_id = conn.execute(text("""
        SELECT id FROM "Country"
        WHERE code='IN'
    """)).fetchone()[0]

    files = sorted(datasets_path.glob("*.xls"))

    print(f"Found {len(files)} files")

    for file in files:

        print(f"\nProcessing {file.name}")

        try:
            # Smart sheet and header detection
            xls = pd.ExcelFile(file)
            df = None
            sheet_name = None
            header_row = None

            for sheet in xls.sheet_names:
                for h in range(10):
                    try:
                        temp = pd.read_excel(
                            file,
                            sheet_name=sheet,
                            header=h,
                            dtype=str
                        )
                        temp.columns = [str(c).strip() for c in temp.columns]
                        if "MDDS PLCN" in temp.columns:
                            df = temp
                            sheet_name = sheet
                            header_row = h
                            break
                    except Exception:
                        pass
                if df is not None:
                    break

            if df is None:
                print(f"Could not find 'MDDS PLCN' in any sheet/header of {file.name}")
                continue

            print(f"Using sheet: {sheet_name}")
            print(f"Found header in row {header_row}")

            print(df.columns.tolist())
            df = df[df["MDDS PLCN"] != "000000"]

            print(f"Villages: {len(df)}")

            state_code = str(df.iloc[0]["MDDS STC"])

            existing = conn.execute(
            text("""
            SELECT id
            FROM "State"
            WHERE code = :code
            """), 
            {"code": state_code}
            ).fetchone()
            if existing:
                print(f"Skipping {file.name} (already imported)")
                continue
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

                if index % 5000 == 0:
                    print(f"{file.name}: {index}")

            print(f"Finished {file.name}")

        except Exception as e:
            print(f"ERROR in {file.name}")
            print(e)

print("\n STATE IMPORTED")