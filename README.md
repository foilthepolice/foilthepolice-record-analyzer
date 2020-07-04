# FOIA Record Analyzer

A small server/worker you can run to turn Use of Force Report PDFs into structured data for anaylsis. Uses machine learning via AWS Textract.

We imagine two future steps for this tool. 1) Improving the flexibility in analyzing use of force reports that differ drastically in format. 2) Allowing the analysis of police contracts for statements that suggest qualified immunity.

If you're interested in helping, please send a message to: contact@foilthepolice.org

![](./screenshot.png)

## Running the tool

This can be run without any hosting on an external site/server but it will require intermediate programming experience.

### Environment

This tool relies on AWS S3 + AWS Textract. Textract is free up to 1,000 pages of analysis. Because there is rate limiting, this setup requires a database to save the jobs and run them at delayed intervals.

Once you have your AWS credentials, create a file called **`.env`** with the following consts:

```
AWS_REGION=
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
DATABASE_CHARSET=utf8
DATABASE_HOST=postgres
DATABASE_NAME=foilthepolice
DATABASE_PORT=5432
DATABASE_USER=foilthepolice
DATABASE_USER_PASSWORD=foilthepolice
PORT=3000
```

The database credentials mirror the postgres conifg in `docker-compose.yml` which is only used for local development.

### Running it

With your credentials and setup done just run: `docker-compose up`. You should see a message saying that a server is running on port 3000.

**There is no interface for tool at the moment. To process documents and retrieve results, you'll want to be aware of the two endpoints.** You can submit information to these with a tool like Postman.

**`POST: localhost:3000/v1/analyze/form`**

Request POST Body:
```javascript
{
  pdf: [form-data] // PDF file submitted as form-data
}
```
Response Data:
```json
{
    "jobId": 96,
    "success": true
}
```

**`GET: localhost:3000/v1/analysis/{jobId}?format=csv`**

Response Data:
```json
{
    "data": [
        {
            "date": "12/26/15",
            "time": "23:07",
            "day_of_week": "Saturday",
            "incident_number": "15-12345",
            "location": "Whippany, NJ",
            "officer_badge_number": "123",
            "officer_name": "Bob Woodsman",
            "officer_race": "Cauc",
            "officer_sex": "M",
            "officer_age": "34",
            "officer_rank": "Patrolman",
            "officer_on_duty": "Yes",
            "officer_uniform": "Yes",
            "officer_assignment": "Patrol Division",
            "officer_years_of_service": "12",
            ...
        },
    ],
    "status": "done",
    "success": true
}
```
Response Data with `?format=csv` parameter:
```
date,time,day_of_week,incident_number,location,officer_badge_number,officer_name,officer_race,officer_sex,officer_age,officer_rank,officer_on_duty,officer_uniform,officer_assignment,officer_years_of_service,officer_injured,officer_killed,subject_race,subject_sex,subject_age,subject_under_influence,subject_unusual_conduct,subject_injured,subject_killed,subject_arrested,subject_charges,subject_actions_resisted_officer,subject_actions_threat_attack_physical,subject_actions_threat_attack_blunt,subject_actions_threat_attack_knife,subject_actions_threat_attack_vehicle,subject_actions_threat_attack_firearm,subject_actions_fired,subject_actions_other,incident_type_crime_in_progress,
"12/26/15","23:07","Saturday","15-12345","Whippany NJ","123","Bob Woodsman 764","Cauc","M","34","Patrolman","Yes","Yes","Patrol Division","12","No","No","Cauc","M","19","X","","No","No","","","X","","","","","","","","","X","","","","","X","","","","","","","","","0",""
...
```