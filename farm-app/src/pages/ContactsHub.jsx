import React from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import SegmentedTabs from '../components/ui/SegmentedTabs';
import { useData } from '../context/DataContext';
import FarmContacts from './FarmContacts';
import Contacts from './Contacts';

/** One place for everyone you call: farm people (labour, buyers, suppliers) and vets */
const ContactsHub = () => {
    const [params, setParams] = useSearchParams();
    const { data } = useData();
    const view = params.get('view') === 'vets' ? 'vets' : 'people';

    return (
        <div className="max-w-5xl mx-auto space-y-5">
            <PageHeader section="contacts" />
            <SegmentedTabs
                layoutId="contacts-view"
                value={view}
                onChange={(v) => setParams(v === 'vets' ? { view: 'vets' } : {}, { replace: true })}
                tabs={[
                    { id: 'people', label: 'Farm people', emoji: '🧑‍🌾', count: (data.farmContacts || []).length },
                    { id: 'vets', label: 'Vets', emoji: '🩺', count: (data.contacts || []).length }
                ]}
            />
            {view === 'vets' ? <Contacts embedded /> : <FarmContacts embedded />}
        </div>
    );
};

export default ContactsHub;
