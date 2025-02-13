import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import AirlineTable from './AirlineTable';
import FeeTable from './FeeTable';
import RouteTable from './RouteTable';
import SelfRedeemTable from './SelfRedeemTable';
import SelfRedeemNotes  from './SelfRedeemNotes';
import PartnerRedeemTable from './PartnerRedeemTable';
import TicketingTable from './TicketingTable';
import './AirlineProgramPage.css';

// Helper function to extract the two-letter code
function extractCode(item) {
  const match = item.match(/\((\w{2})\)/);
  if (match) {
    return match[1].toUpperCase();
  }
  // If the input is exactly two letters (case-insensitive), return them in uppercase.
  if (item && item.length === 2 && /^[a-zA-Z0-9]{2}$/.test(item)) {
    return item.toUpperCase();
  }
  return null;
}

function AirlineProgramPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const statePrograms = location.state?.programs;

  // Memoize programList to prevent it from being re-created on every render.
  const programList = useMemo(() => {
    if (statePrograms && Object.keys(statePrograms).length > 0) {
      return Array.isArray(statePrograms)
        ? statePrograms
        : Object.values(statePrograms);
    } else {
      // Read all the "program" query parameters. For example: /ProgramDetails?program=AA&program=CZ
      return searchParams.getAll('program');
    }
  }, [statePrograms, searchParams]);


  // Read all the "program" query parameters. For example, the URL may look like: /ProgramDetails?program=AA&program=CZ
  const [programDetails, setProgramDetails] = useState({});

  // Refs to track fetched codes and prevent overlapping fetch calls.
  const fetchedCodesRef = useRef(new Set());
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    // Determine which codes need to be fetched.
    const codesToFetch = programList
      .map(program => extractCode(program))
      .filter((code) => code && !fetchedCodesRef.current.has(code));

    if (codesToFetch.length === 0) {
      isFetchingRef.current = false;
      return;
    }

    const fetchDetails = async () => {
      try {
        const results = await Promise.all(
          codesToFetch.map(async (code) => {
            const response = await fetch(`http://localhost:5000/api/award-programs/${code}`);
            const data = await response.json();
            return { code, data };
          })
        );

        results.forEach(({ code }) => {
          fetchedCodesRef.current.add(code);
        });

        // Update programDetails only if there is a change.
        setProgramDetails((prevDetails) => {
          const newDetails = { ...prevDetails };
          let updated = false;
          results.forEach(({ code, data }) => {
            if (!prevDetails[code] || prevDetails[code].updatedDate !== data.updatedDate) {
              newDetails[code] = data;
              updated = true;
            }
          });
          return updated ? newDetails : prevDetails;
        });
      } catch (error) {
        console.error("Error fetching program details:", error);
      } finally {
        isFetchingRef.current = false;
      }
    };

    fetchDetails();
  }, [programList]);

  return (
    <div className="search-by-issuing-page">
      <section className="intro">
        <h1>Browse an Airline Program</h1>
        <p>
          Explore detailed information for the program you selected, including cost, change and cancel, 
          layover and stopover, expiration, etc.
        </p>
        <div className="intro-with-background">
          <p className="remark">
            * means this is an experienced rather than an officially published rule.
          </p>
          <p className="remark">^ means clicking to view more details.</p>
        </div>
      </section>

      <section className="program-details">
        <div className="block-container">
          {programList.map((program, index) => {
            const code = extractCode(program);
            const details = programDetails[code];
            return (
              <div key={index} className="block">
                <div className="program-name-container">
                  <h2 className="program-name">{program}</h2>
                  <p className="updated-date">
                    Updated on: {details?.updatedDate || "Not available"}
                  </p>
                </div>
                {code && details && (
                  <>
                    <h3>Full Redeemable Airline List</h3>
                    <AirlineTable programDetails={details} />

                    <h3>Additional Fees</h3>
                    <FeeTable programDetails={details} />

                    <h3>Ticketing Policy</h3>
                    <TicketingTable programDetails={details} />

                    <h3>Routing Policy</h3>
                    <RouteTable programDetails={details} />

                    <h3>Redeem on Flights Operated by {code}</h3>
                    <SelfRedeemTable programDetails={details} />

                    <SelfRedeemNotes programDetails={details} />

                    <h3>Redeem on Flights Operated by Partners</h3>
                    <PartnerRedeemTable programDetails={details} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default AirlineProgramPage;
